/**
 * Cliente HTTP do Hermes API Server (ARCHITECTURE §7).
 *
 * Invariantes de transporte que não podem ser relaxadas:
 * - o host é sempre o literal `127.0.0.1` (vem de discovery.ts): a porta do
 *   api_server escuta somente IPv4 e "localhost" pode resolver para ::1;
 * - NENHUMA requisição define o header `Origin`: o middleware de CORS responde
 *   403 com corpo vazio antes mesmo da autenticação (armadilha 1);
 * - a única forma de auth é `Authorization: Bearer <API_SERVER_KEY>`, com "B"
 *   maiúsculo e um espaço (armadilha 48). A chave só aparece dentro de
 *   `buildHeaders()`; nenhuma função deste módulo a devolve, loga ou serializa;
 * - `X-Hermes-Session-Key` só vai nas três rotas que o leem; `X-Hermes-Session-Id`
 *   e `Idempotency-Key` nunca são enviados (desvios D2/D3 da ARCHITECTURE §0).
 *
 * Endpoints deliberadamente NÃO implementados — D-05 de DECISOES-VERIFICADAS:
 * `POST /v1/chat/completions` funciona e faz streaming corretamente (foi capturado
 * ao vivo), mas cria sessões com `source: "api_server"`, que o Hermes Desktop
 * classifica como plataforma de mensageria e exclui de "Recentes". `/v1/responses`
 * é pior ainda: grava em `response_store.db`, fora do `state.db` que o Desktop lê.
 * Como a sincronia com o Desktop é o objetivo declarado do produto, o caminho
 * oficial para perguntar ao Hermes é `startConversation()` / `askInSession()`,
 * que implementam o fluxo provado em D-01 (sessão `source:"desktop"` + `/v1/runs`).
 */

import { randomUUID } from "node:crypto";
import { invalidateBaseUrl, resolveBaseUrl } from "./discovery";
import {
  HermesConnectionError,
  HermesProtocolError,
  HermesValidationError,
  mapHttpError,
  toHermesError,
} from "./errors";
import { getHermesPreferences, requireApiKey, resolveApiKey } from "./preferences";
import type { ToolsetAvailability } from "./status";
import { forgetDetectedApiKey } from "./storage";
import type * as T from "./types";

/* ────────────────────────────── Transporte ────────────────────────────── */

const DEFAULT_TIMEOUT_MS = 15_000;
/** Turno síncrono de conversa: o agente pode levar minutos. */
const CHAT_TIMEOUT_MS = 300_000;
/** `/api/model/options` resolve tudo no event loop do servidor. */
const SLOW_TIMEOUT_MS = 30_000;
/**
 * `/v1/toolsets` é pior que lento: o handler roda no event loop do servidor e pode disparar
 * uma leitura síncrona de ~8 s ao portal da Nous (`hermes_cli/nous_account.py:595`), travando
 * o Hermes INTEIRO enquanto isso. Um corte curto é proteção do usuário, não impaciência:
 * passou disso, o servidor está preso e insistir só prolonga a trava.
 */
const TOOLSETS_TIMEOUT_MS = 12_000;
/** Streams: vale só até os headers chegarem; depois o corpo flui sem limite. */
const STREAM_HEADERS_TIMEOUT_MS = 20_000;
/** Teto do `Retry-After` honrado automaticamente. */
const MAX_RETRY_DELAY_MS = 5_000;

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: Method;
  /** Caminho absoluto começando com "/". */
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  /** Serializado com JSON.stringify quando definido. */
  body?: unknown;
  /** AbortSignal do componente (desmontagem ou botão "Parar"). */
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Envia `X-Hermes-Session-Key`. Só nas rotas que o leem. */
  withSessionKey?: boolean;
  /** Omite o Authorization. Só `/health`, que é público, usa isto. */
  anonymous?: boolean;
  /**
   * Chave explícita, em vez da resolvida por `requireApiKey()`. Existe para UM caso:
   * validar uma credencial recém-lida ANTES de persisti-la (UX-SPEC §3.5). Sem isto a
   * detecção automática validaria a preferência (que vence na §3.3) e diria "encontrada
   * e guardada" sobre uma chave que nunca foi testada.
   */
  apiKey?: string;
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions["query"]): string {
  const url = new URL(baseUrl + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** O servidor devolve 400 para \r, \n, \0 e para mais de 256 chars. */
function safeSessionKey(raw: string): string {
  return raw.replace(/[\r\n\0]/g, "").slice(0, 256);
}

/**
 * `requireApiKey()` é assíncrona (a chave detectada mora no LocalStorage): sem o
 * `await` o header sairia como `Bearer [object Promise]` e TODA requisição autenticada
 * levaria 401 — por isso `buildHeaders` também é assíncrona.
 */
async function buildHeaders(options: RequestOptions, accept: string): Promise<Headers> {
  const headers = new Headers();
  if (!options.anonymous) headers.set("Authorization", `Bearer ${options.apiKey ?? (await requireApiKey())}`);
  headers.set("Accept", accept);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.withSessionKey) {
    const sessionKey = safeSessionKey(getHermesPreferences().sessionKey);
    if (sessionKey !== "") headers.set("X-Hermes-Session-Key", sessionKey);
  }
  // PROIBIDOS aqui e em qualquer outro lugar: Origin, Cookie, X-Hermes-Session-Id.
  return headers;
}

function linkSignals(internal: AbortSignal, external?: AbortSignal): AbortSignal {
  return external ? AbortSignal.any([internal, external]) : internal;
}

/** Código de erro do Node, que o fetch aninha em `cause`. */
function nodeErrorCode(err: unknown): string | undefined {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = e?.code ?? e?.cause?.code;
  return typeof code === "string" ? code : undefined;
}

function statusOf(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

function retryDelayMs(err: unknown): number {
  const seconds = (err as { retryAfterSeconds?: unknown } | null)?.retryAfterSeconds;
  const value = typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0 ? seconds : 1;
  return Math.min(value * 1000, MAX_RETRY_DELAY_MS);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(Object.assign(new Error("Operation cancelled"), { name: "AbortError" }));
  }
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(Object.assign(new Error("Operation cancelled"), { name: "AbortError" }));
    };
    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      signal?.removeEventListener("abort", onAbort);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

/**
 * UX-SPEC §3.3, para TODOS os comandos: um 401 invalida a chave DETECTADA na hora, para
 * que a próxima tela ofereça `Detectar configuração automaticamente` em vez de repetir E2
 * para sempre. A preferência nunca é apagada — é intenção explícita do usuário — e uma
 * chave passada em `options.apiKey` pertence a quem a passou (a detecção da §3.5).
 */
async function forgetDetectedKeyAfterAuthFailure(options: RequestOptions): Promise<void> {
  if (options.anonymous || options.apiKey !== undefined) return;
  const { source } = await resolveApiKey();
  if (source === "detected") await forgetDetectedApiKey();
}

interface RawResponse {
  response: Response;
  /** Desarma o timeout. Chamar depois de consumir (ou descartar) o corpo. */
  release: () => void;
}

/**
 * Executa a requisição e devolve o Response cru com o erro HTTP já mapeado.
 *
 * `headersOnlyTimeout` é o que torna streams viáveis: o timer é desarmado assim
 * que os headers chegam, porque uma run pode transmitir por minutos e o servidor
 * manda `: keepalive` a cada 30 s (armadilha 32).
 */
async function rawRequest(
  options: RequestOptions,
  accept: string,
  headersOnlyTimeout: boolean,
  attempt = 0,
): Promise<RawResponse> {
  const headers = await buildHeaders(options, accept);
  const endpoint = await resolveBaseUrl();
  const method = options.method ?? "GET";
  const timeoutMs = options.timeoutMs ?? (headersOnlyTimeout ? STREAM_HEADERS_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(Object.assign(new Error("timeout"), { name: "TimeoutError" }));
  }, timeoutMs);
  const release = () => clearTimeout(timer);

  let response: Response;
  try {
    response = await fetch(buildUrl(endpoint.baseUrl, options.path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: linkSignals(controller.signal, options.signal),
      // Sem `mode`, `credentials` ou `referrer`: são conceitos de browser e qualquer
      // polyfill que os traduzisse em Origin derrubaria todas as requisições.
    });
  } catch (err) {
    release();
    const mapped = toHermesError(err, `${method} ${options.path}`);
    if (mapped instanceof HermesConnectionError) {
      // O gateway pode ter reiniciado em outra porta: descarta a baseUrl memoizada.
      await invalidateBaseUrl();
      // ECONNREFUSED garante que a requisição não chegou ao servidor, então repetir
      // é seguro até para POST. Uma única vez, com nova resolução de porta (R10).
      if (attempt === 0 && nodeErrorCode(err) === "ECONNREFUSED") {
        return rawRequest(options, accept, headersOnlyTimeout, attempt + 1);
      }
    }
    throw mapped;
  }

  if (headersOnlyTimeout) release();

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    release();
    const mapped = mapHttpError({
      method,
      path: options.path,
      status: response.status,
      retryAfter: response.headers.get("Retry-After"),
      body,
    });
    if (response.status === 401) await forgetDetectedKeyAfterAuthFailure(options);
    throw mapped;
  }

  return { response, release };
}

/**
 * Requisição JSON. Faz UM retry em 429/503 honrando `Retry-After` (teto de 5 s) e
 * somente quando o método é GET — repetir POST automaticamente duplicaria efeitos.
 */
export async function requestJson<TResult>(options: RequestOptions): Promise<TResult> {
  const method = options.method ?? "GET";
  for (let attempt = 0; ; attempt++) {
    try {
      const { response, release } = await rawRequest(options, "application/json", false);
      try {
        const text = await response.text();
        // 204 e corpos vazios: quem chama tipa o retorno como void/undefined.
        if (text.trim() === "") return undefined as TResult;
        try {
          return JSON.parse(text) as TResult;
        } catch {
          throw new HermesProtocolError({
            userMessage: "Unexpected answer from Hermes.",
            technical: `${method} ${options.path} returned HTTP ${response.status} with a non-JSON body: ${text.slice(0, 500)}`,
            recovery: "report_bug",
          });
        }
      } finally {
        release();
      }
    } catch (err) {
      const status = statusOf(err);
      const canRetry = attempt === 0 && method === "GET" && (status === 429 || status === 503);
      if (!canRetry) throw err;
      await delay(retryDelayMs(err), options.signal);
    }
  }
}

/**
 * Abre um stream SSE e devolve o Response com o corpo intacto — quem consome é
 * hermes-events.ts. Erros ANTES do stream abrir chegam aqui como HermesError;
 * erros DEPOIS vêm como eventos dentro do stream, com HTTP 200 (armadilha 33).
 */
export async function requestStream(options: RequestOptions): Promise<Response> {
  const { response } = await rawRequest({ ...options, method: options.method ?? "POST" }, "text/event-stream", true);
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    throw new HermesProtocolError({
      userMessage: "Unexpected answer from Hermes.",
      technical: `${options.method ?? "POST"} ${options.path} deveria devolver text/event-stream, veio "${contentType}".`,
      recovery: "report_bug",
    });
  }
  if (!response.body) {
    throw new HermesProtocolError({
      userMessage: "Unexpected answer from Hermes.",
      technical: `${options.path}: response.body is null.`,
      recovery: "report_bug",
    });
  }
  return response;
}

/* ───────────────────────── Saúde e capacidades ────────────────────────── */

/**
 * GET /health — única rota sem autenticação, por isso `anonymous`: a tela de
 * diagnóstico precisa distinguir "servidor fora" de "chave errada".
 * A validação `platform === "hermes-agent"` (a porta 8644 também responde /health)
 * é responsabilidade de discovery.ts; aqui o corpo volta como veio.
 */
export function health(signal?: AbortSignal): Promise<T.HealthResponse> {
  return requestJson<T.HealthResponse>({ path: "/health", anonymous: true, signal });
}

/** GET /v1/capabilities. Um 401 aqui significa CHAVE ERRADA — é o teste canônico. */
export function getCapabilities(signal?: AbortSignal): Promise<T.Capabilities> {
  return requestJson<T.Capabilities>({ path: "/v1/capabilities", signal });
}

/** Feature-detection tolerante: chave ausente ⇒ indisponível (ver D-04 para jobs_admin). */
export function hasFeature(caps: T.Capabilities | undefined, feature: keyof T.HermesFeatures): boolean {
  return caps?.features?.[feature] === true;
}

/** Jobs e toolsets não têm flag em `features`: o gate é a presença no mapa `endpoints`. */
export function hasEndpoint(caps: T.Capabilities | undefined, name: string): boolean {
  return Boolean(caps?.endpoints?.[name]);
}

/* ──────────────────────────────  Modelos  ─────────────────────────────── */

/**
 * `apiKey` só é usado pela detecção automática (§3.5), para provar a chave que ela
 * acabou de ler ANTES de gravá-la. Todo o resto omite e usa a chave resolvida.
 */
export function listModels(signal?: AbortSignal, apiKey?: string): Promise<T.ModelListResponse> {
  return requestJson<T.ModelListResponse>({ path: "/v1/models", signal, apiKey });
}

/** `refresh=true` re-sonda TODOS os provedores: é lento, use só sob ação explícita. */
export function getModelOptions(refresh = false, signal?: AbortSignal): Promise<T.ModelOptionsResponse> {
  return requestJson<T.ModelOptionsResponse>({
    path: "/api/model/options",
    query: refresh ? { refresh: "true" } : undefined,
    timeoutMs: SLOW_TIMEOUT_MS,
    signal,
  });
}

/** Achata providers × models numa lista pronta para o seletor da UI. */
export function flattenModelOptions(payload: T.ModelOptionsResponse): T.ModelOption[] {
  const out: T.ModelOption[] = [];
  for (const provider of payload.providers ?? []) {
    const featured = new Set(provider.featured_models ?? []);
    for (const model of provider.models ?? []) {
      const caps = provider.capabilities?.[model];
      out.push({
        provider: provider.slug,
        providerName: provider.name,
        model,
        fast: caps?.fast ?? false,
        reasoning: caps?.reasoning ?? false,
        pricing: provider.pricing?.[model],
        authenticated: provider.authenticated !== false,
        isCurrent: provider.is_current === true && payload.model === model,
        isFeatured: featured.has(model),
      });
    }
  }
  return out;
}

/* ──────────────────────────  Sessões (CRUD)  ──────────────────────────── */

/** R3 / desvio D7: constante, nunca configurável. Qualquer outro valor tira a
 * conversa dos "Recentes" do Hermes Desktop. */
export const RAYCAST_SESSION_SOURCE: T.SessionSourceInput = "desktop";

/** UX-SPEC §0.3: "título = primeiros 60 caracteres da pergunta". */
const MAX_TITLE_LENGTH = 60;
/** §0.3: colisão ⇒ `" (2)"`, `" (3)"`; na terceira falha, criar SEM título. */
const TITLE_COLLISION_SUFFIXES = [" (2)", " (3)"] as const;

/** Id legível, sem "/", "\", ":" nem "..", compatível com o deep link do Desktop (R7). */
export function newSessionId(): string {
  return `raycast_${Date.now()}_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

/**
 * Título derivado do prompt: os primeiros 60 caracteres da pergunta (UX-SPEC §0.3).
 *
 * Sem sufixo aleatório de propósito. Títulos são ÚNICOS no banco inteiro e a colisão
 * devolve 400 `invalid_title` (armadilha 6), mas a resposta a ela é
 * `conversationTitleAttempt()` — `" (2)"`, `" (3)"`, depois nenhum título. Um sufixo
 * hexadecimal deixaria "Resuma este relatório · a3f9c1" na lista do Raycast, na metadata
 * `Conversa` e nos Recentes do Hermes Desktop, que é justamente o que a §0.3 evita.
 */
export function conversationTitle(prompt: string): string {
  // `\p{Cc}` é a categoria Unicode dos caracteres de controle (U+0000–U+001F e
  // U+007F–U+009F). Diz a intenção melhor que uma faixa literal e não dispara o
  // `no-control-regex` do ESLint, cuja razão de existir é justamente pegar faixas dessas.
  const cleaned = prompt
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = cleaned === "" ? "Raycast conversation" : cleaned;
  return base.length > MAX_TITLE_LENGTH ? base.slice(0, MAX_TITLE_LENGTH).trimEnd() : base;
}

/**
 * §0.3 — o título da tentativa `attempt` (0-based) de criar a conversa.
 * `undefined` significa "já esgotamos os sufixos: criar SEM título".
 */
export function conversationTitleAttempt(prompt: string, attempt: number): string | undefined {
  const base = conversationTitle(prompt);
  if (attempt === 0) return base;
  const suffix = TITLE_COLLISION_SUFFIXES[attempt - 1];
  if (suffix === undefined) return undefined;
  const room = MAX_TITLE_LENGTH - suffix.length;
  return `${base.length > room ? base.slice(0, room).trimEnd() : base}${suffix}`;
}

export interface ListSessionsParams {
  limit?: number;
  offset?: number;
  source?: string;
  includeChildren?: boolean;
  signal?: AbortSignal;
}

export function listSessions(params: ListSessionsParams = {}): Promise<T.SessionListResponse> {
  const limit = Math.min(Math.max(params.limit ?? getHermesPreferences().maxHistoryItems, 1), 200);
  return requestJson<T.SessionListResponse>({
    path: "/api/sessions",
    query: {
      limit,
      offset: params.offset ?? 0,
      source: params.source,
      include_children: params.includeChildren ? "1" : undefined,
    },
    signal: params.signal,
  });
}

/**
 * Armadilha 8: linhas fixadas são inseridas ALÉM do `limit` e `has_more` conta
 * somente as não fixadas. O próximo offset é o atual + as não fixadas recebidas.
 */
export function nextSessionOffset(currentOffset: number, page: T.SessionListResponse): number {
  return currentOffset + page.data.filter((session) => session.pinned !== true).length;
}

export interface CreateSessionInput {
  /** Sem ele o servidor gera `api_<epoch>_<8hex>`. Máx. 256, sem \r \n \0 nem "..". */
  id?: string;
  title?: string;
  systemPrompt?: string;
  model?: string;
  provider?: string;
  modelOptions?: T.ModelOptionsRequest;
  requireModelLock?: boolean;
}

/**
 * POST /api/sessions → 201. `source` é SEMPRE "desktop" (R3) e nunca é parâmetro.
 *
 * R4: uma sessão sem mensagens é invisível no Desktop (a barra lateral consulta
 * `min_messages=1`) e vira lixo no banco. Não chame isto a partir de um botão
 * "Nova conversa" — use `startConversation()`, que já emenda o primeiro turno.
 */
export function createSession(input: CreateSessionInput = {}, signal?: AbortSignal): Promise<T.SessionEnvelope> {
  return requestJson<T.SessionEnvelope>({
    method: "POST",
    path: "/api/sessions",
    body: {
      ...(input.id ? { id: input.id } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.systemPrompt ? { system_prompt: input.systemPrompt } : {}),
      ...(input.model ? { model: input.model } : {}),
      ...(input.provider ? { provider: input.provider } : {}),
      ...(input.modelOptions ? { model_options: input.modelOptions } : {}),
      ...(input.requireModelLock ? { require_model_lock: true } : {}),
      source: RAYCAST_SESSION_SOURCE,
    },
    signal,
  });
}

export function getSession(sessionId: string, signal?: AbortSignal): Promise<T.SessionEnvelope> {
  return requestJson<T.SessionEnvelope>({ path: `/api/sessions/${encodeURIComponent(sessionId)}`, signal });
}

/**
 * R5: exatamente estes 6 campos são aceitos. Qualquer outro devolve 400
 * `unsupported_session_field`; valor não-booleano nos flags devolve 400
 * `invalid_session_field`. `source` NÃO é patchável.
 */
export interface SessionPatch {
  title?: string | null;
  pinned?: boolean;
  archived?: boolean;
  hidden?: boolean;
  unread?: boolean;
  /** Truthy ENCERRA a sessão. Não use como metadado. */
  end_reason?: string;
}

const PATCHABLE_SESSION_FIELDS = ["title", "pinned", "archived", "hidden", "unread", "end_reason"] as const;

export function updateSession(
  sessionId: string,
  patch: SessionPatch,
  signal?: AbortSignal,
): Promise<T.SessionEnvelope> {
  // Filtro defensivo: um campo a mais aqui derruba o PATCH inteiro com 400.
  const body: Record<string, unknown> = {};
  for (const field of PATCHABLE_SESSION_FIELDS) {
    if (patch[field] !== undefined) body[field] = patch[field];
  }
  return requestJson<T.SessionEnvelope>({
    method: "PATCH",
    path: `/api/sessions/${encodeURIComponent(sessionId)}`,
    body,
    signal,
  });
}

export function deleteSession(sessionId: string, signal?: AbortSignal): Promise<T.SessionDeletedResponse> {
  return requestJson<T.SessionDeletedResponse>({
    method: "DELETE",
    path: `/api/sessions/${encodeURIComponent(sessionId)}`,
    signal,
  });
}

/** R4: limpeza best-effort quando o usuário desiste antes do primeiro turno. */
export async function deleteSessionIfEmpty(sessionId: string): Promise<void> {
  try {
    const { session } = await getSession(sessionId);
    if ((session.message_count ?? 0) === 0) await deleteSession(sessionId);
  } catch {
    /* silencioso: é limpeza, não fluxo principal */
  }
}

export interface MessagesPage {
  limit?: number;
  offset?: number;
  order?: "oldest" | "latest";
  signal?: AbortSignal;
}

/**
 * GET /api/sessions/{id}/messages. Com `order=latest` o offset conta a partir da
 * mensagem MAIS NOVA e a página volta em ordem cronológica — é o idioma para
 * paginar "para trás" (armadilha 11). O `session_id` da resposta pode DIFERIR do
 * pedido (resolve continuações de compressão): adote sempre o da resposta.
 */
export function getSessionMessages(sessionId: string, page: MessagesPage = {}): Promise<T.SessionMessagesResponse> {
  return requestJson<T.SessionMessagesResponse>({
    path: `/api/sessions/${encodeURIComponent(sessionId)}/messages`,
    query: {
      limit: Math.min(page.limit ?? 120, 500),
      offset: page.offset ?? 0,
      order: page.order ?? "latest",
    },
    signal: page.signal,
  });
}

/**
 * POST /api/sessions/{id}/fork → 201. O pai é encerrado com `end_reason: "branched"`.
 * Atenção (armadilha 7): o filho é carimbado com `source: "api_server"` e `source`
 * não é patchável — o fork NÃO aparece nos Recentes do Desktop.
 */
export function forkSession(
  sessionId: string,
  input: { id?: string; title?: string } = {},
  signal?: AbortSignal,
): Promise<T.SessionEnvelope> {
  return requestJson<T.SessionEnvelope>({
    method: "POST",
    path: `/api/sessions/${encodeURIComponent(sessionId)}/fork`,
    body: { ...(input.id ? { id: input.id } : {}), ...(input.title ? { title: input.title } : {}) },
    signal,
  });
}

/* ─────────────────────────  Turno de conversa  ────────────────────────── */

export interface SessionChatRequest {
  /** Obrigatório e com conteúdo visível, senão 400 `missing_message`. */
  message: string;
  /** System prompt efêmero deste turno. */
  systemMessage?: string;
  model?: string;
  provider?: string;
  modelOptions?: T.ModelOptionsRequest;
  requireModelLock?: boolean;
}

/**
 * P3: a precedência é `request` > LocalStorage (`nextTurnModel` → `defaultModel`) >
 * preferência. Este módulo só conhece as duas pontas: `request` e a preferência.
 * O degrau do meio é assíncrono e mora no LocalStorage, que este módulo não importa —
 * quem chama resolve antes (chaves `StorageKeys.nextTurnModel`/`defaultModel`) e entrega
 * o resultado já pronto em `request.model` / `request.provider`.
 */
function chatBody(request: SessionChatRequest): Record<string, unknown> {
  const prefs = getHermesPreferences();
  const model = request.model ?? prefs.defaultModel;
  const provider = request.provider ?? prefs.defaultProvider;
  return {
    message: request.message,
    ...(request.systemMessage ? { system_message: request.systemMessage } : {}),
    ...(model ? { model } : {}),
    ...(provider ? { provider } : {}),
    ...(request.modelOptions ? { model_options: request.modelOptions } : {}),
    ...(request.requireModelLock ? { require_model_lock: true } : {}),
  };
}

/** POST /api/sessions/{id}/chat — turno síncrono, resposta completa de uma vez. */
export function sendSessionChat(
  sessionId: string,
  request: SessionChatRequest,
  signal?: AbortSignal,
): Promise<T.SessionChatResponse> {
  return requestJson<T.SessionChatResponse>({
    method: "POST",
    path: `/api/sessions/${encodeURIComponent(sessionId)}/chat`,
    body: chatBody(request),
    withSessionKey: true,
    timeoutMs: CHAT_TIMEOUT_MS,
    signal,
  });
}

/**
 * POST /api/sessions/{id}/chat/stream — SSE com eventos nomeados.
 *
 * ATENÇÃO (armadilha 13): abortar este fetch INTERROMPE o turno do agente no
 * servidor. É assim que se implementa "Parar", e é exatamente por isso que este
 * endpoint não serve para tarefas longas — fechar a janela do Raycast cancelaria
 * o turno, contrariando o princípio 8 do brief. Tarefas longas usam `/v1/runs`.
 */
export function openSessionChatStream(
  sessionId: string,
  request: SessionChatRequest,
  signal?: AbortSignal,
): Promise<Response> {
  return requestStream({
    method: "POST",
    path: `/api/sessions/${encodeURIComponent(sessionId)}/chat/stream`,
    body: chatBody(request),
    withSessionKey: true,
    signal,
  });
}

/* ──────────────────────────────  Runs  ────────────────────────────────── */

export interface CreateRunInput {
  /** SEMPRE string: um array de content-blocks chega não-achatado ao agente. */
  input: string;
  instructions?: string;
  /** Sem ele o servidor usa o próprio run_id como session_id e NENHUMA sessão é gravada. */
  sessionId?: string;
  model?: string;
  provider?: string;
  modelOptions?: T.ModelOptionsRequest;
  conversationHistory?: Array<{ role: string; content: string }>;
}

/** POST /v1/runs → 202 `{run_id, status:"started"}`. "started" NÃO é um RunStatus. */
export function createRun(input: CreateRunInput, signal?: AbortSignal): Promise<T.RunCreatedResponse> {
  const prefs = getHermesPreferences();
  const model = input.model ?? prefs.defaultModel;
  const provider = input.provider ?? prefs.defaultProvider;
  return requestJson<T.RunCreatedResponse>({
    method: "POST",
    path: "/v1/runs",
    body: {
      input: input.input,
      ...(input.instructions ? { instructions: input.instructions } : {}),
      ...(input.sessionId ? { session_id: input.sessionId } : {}),
      ...(model ? { model } : {}),
      ...(provider ? { provider } : {}),
      ...(input.modelOptions ? { model_options: input.modelOptions } : {}),
      ...(input.conversationHistory ? { conversation_history: input.conversationHistory } : {}),
    },
    withSessionKey: true,
    signal,
  });
}

export function getRun(runId: string, signal?: AbortSignal): Promise<T.Run> {
  return requestJson<T.Run>({ path: `/v1/runs/${encodeURIComponent(runId)}`, signal });
}

/**
 * GET /v1/runs/{id}/events — devolve o Response para hermes-events.ts parsear.
 *
 * Stream de consumidor ÚNICO e NÃO retomável: assine imediatamente após o 202
 * (o transporte expira em 5 min sem assinante) e mantenha no máximo um stream por
 * run_id no processo. Ao desconectar a fila é destruída e uma nova assinatura dá
 * 404 — mas a run continua viva (D-02); a recuperação é polling de `getRun()`.
 */
export function openRunEventStream(runId: string, signal?: AbortSignal): Promise<Response> {
  return requestStream({ method: "GET", path: `/v1/runs/${encodeURIComponent(runId)}/events`, signal });
}

/**
 * As aprovações são FIFO e não endereçáveis: o `request_id` do evento serve só
 * para correlação, o POST resolve a mais antiga (ou todas com `resolveAll`).
 * Renderize sempre uma por vez, com o `command` e a `description` à vista.
 */
export function respondToApproval(
  runId: string,
  choice: T.ApprovalChoice,
  resolveAll = false,
  signal?: AbortSignal,
): Promise<T.RunApprovalResponse> {
  return requestJson<T.RunApprovalResponse>({
    method: "POST",
    path: `/v1/runs/${encodeURIComponent(runId)}/approval`,
    body: { choice, ...(resolveAll ? { resolve_all: true } : {}) },
    signal,
  });
}

/** Só é aceito com status EXATAMENTE "running"; fora disso o servidor devolve 409. */
export function steerRun(runId: string, text: string, signal?: AbortSignal): Promise<T.RunSteerResponse> {
  return requestJson<T.RunSteerResponse>({
    method: "POST",
    path: `/v1/runs/${encodeURIComponent(runId)}/steer`,
    body: { input: text },
    signal,
  });
}

/**
 * Corpo ignorado pelo servidor. 404 aqui significa "a run já terminou", não erro.
 * "stopping" não emite evento no stream: renderize "Stopping" a partir deste
 * 200 e siga no polling até `cancelled`/`completed` (armadilha 20).
 */
export function stopRun(runId: string, signal?: AbortSignal): Promise<T.RunStopResponse> {
  return requestJson<T.RunStopResponse>({ method: "POST", path: `/v1/runs/${encodeURIComponent(runId)}/stop`, signal });
}

/**
 * Não existe `GET /v1/runs`: a lista é reconstruída do LocalStorage. Um 404 aqui
 * é "expirado/perdido" (status terminal vive 1 h, reinício do gateway apaga tudo)
 * e NUNCA deve ser exibido como "falhou" (armadilha 17).
 */
export async function reconcileRun(runId: string, signal?: AbortSignal): Promise<T.Run | "expired"> {
  try {
    return await getRun(runId, signal);
  } catch (err) {
    if (statusOf(err) === 404) return "expired";
    throw err;
  }
}

/* ───────────  O fluxo principal: D-01 (sessão desktop + run)  ──────────── */

export interface StartConversationInput {
  /** Pergunta do usuário. Vira a primeira mensagem da conversa. */
  input: string;
  /** Título da conversa. Omitido ⇒ derivado do prompt, já com sufixo único. */
  title?: string;
  instructions?: string;
  model?: string;
  provider?: string;
  modelOptions?: T.ModelOptionsRequest;
}

export interface StartedConversation {
  /** Id da sessão criada — persista em `lastSessionId` e use em `askInSession()`. */
  sessionId: string;
  /** Persista ANTES de renderizar: não há rota que liste runs. */
  runId: string;
  /** `undefined` quando a §0.3 esgotou os sufixos e a conversa nasceu sem título. */
  title?: string;
}

/**
 * Fluxo PROVADO em D-01 — é o motor de "Perguntar ao Hermes".
 *
 *   POST /api/sessions {"source":"desktop","title":"<único>"}
 *   POST /v1/runs      {"input":"…","session_id":"<id da sessão>"}
 *
 * Por que os dois passos, e não `/api/sessions/{id}/chat/stream` nem
 * `/v1/chat/completions`:
 * - a run sobrevive à desconexão do cliente (D-02), então fechar a janela do
 *   Raycast não cancela nada — princípio 8 do brief;
 * - mesmo assim as mensagens do turno são gravadas no `state.db` com a sessão
 *   preservada em `source:"desktop"` (verificado: message_count foi a 2), então o
 *   Hermes Desktop enxerga a conversa em "Recentes";
 * - `/v1/chat/completions` criaria a sessão com `source:"api_server"` (D-05).
 *
 * R4: se a run não for aceita, a sessão recém-criada é apagada — o produto nunca
 * deixa para trás uma sessão vazia, que seria uma linha invisível no Desktop.
 */
export async function startConversation(
  input: StartConversationInput,
  signal?: AbortSignal,
): Promise<StartedConversation> {
  const titleIsOurs = input.title === undefined;
  let title = input.title ?? conversationTitleAttempt(input.input, 0);
  let session: T.Session;
  /** R7: id duplicado (409) é retentado UMA vez, com outro id. */
  let idRetried = false;
  /** §0.3: 0 = título puro, 1 = `" (2)"`, 2 = `" (3)"`, 3 = sem título. */
  let titleAttempt = 0;

  for (;;) {
    try {
      const created = await createSession(
        {
          id: newSessionId(),
          title,
          model: input.model,
          provider: input.provider,
          modelOptions: input.modelOptions,
        },
        signal,
      );
      session = created.session;
      break;
    } catch (err) {
      const code = (err as { code?: string | null }).code;
      // R7: id duplicado (409) ⇒ gerar outro e tentar UMA vez.
      if (code === "session_exists" && !idRetried) {
        idRetried = true;
        continue;
      }
      // §0.3: título duplicado (400) ⇒ `" (2)"`, `" (3)"` e, na terceira falha, criar
      // SEM título. Só quando fomos nós que derivamos o título; se veio do usuário, o
      // erro sobe para o formulário pedir outro.
      if (code === "invalid_title" && titleIsOurs && titleAttempt < TITLE_COLLISION_SUFFIXES.length + 1) {
        titleAttempt += 1;
        title = conversationTitleAttempt(input.input, titleAttempt);
        continue;
      }
      throw err;
    }
  }

  const sessionId = session.id;
  try {
    const run = await createRun(
      {
        input: input.input,
        instructions: input.instructions,
        sessionId,
        model: input.model,
        provider: input.provider,
        modelOptions: input.modelOptions,
      },
      signal,
    );
    return { sessionId, runId: run.run_id, title: session.title ?? title ?? undefined };
  } catch (err) {
    // Sem primeiro turno a sessão fica com 0 mensagens: desfaz (R4).
    // Sem `signal`: a limpeza precisa acontecer mesmo se o usuário cancelou.
    await deleteSession(sessionId).catch(() => undefined);
    throw err;
  }
}

export interface AskInSessionOptions {
  instructions?: string;
  model?: string;
  provider?: string;
  modelOptions?: T.ModelOptionsRequest;
}

/**
 * Perguntas seguintes na MESMA conversa (D-01): reutiliza o `session_id`, então
 * o histórico continua sendo o mesmo que o Desktop mostra.
 *
 * R9: mantenha no máximo um turno vivo por sessão — não há trava entre superfícies
 * e duas escritas concorrentes se intercalam.
 */
export function askInSession(
  sessionId: string,
  input: string,
  options: AskInSessionOptions = {},
  signal?: AbortSignal,
): Promise<T.RunCreatedResponse> {
  return createRun({ ...options, input, sessionId }, signal);
}

/* ──────────────────────────  Skills e toolsets  ───────────────────────── */

/** Devolve SOMENTE skills habilitadas; não há `enabled`, paginação nem filtro. */
export function listSkills(signal?: AbortSignal): Promise<T.SkillListResponse> {
  return requestJson<T.SkillListResponse>({ path: "/v1/skills", signal });
}

/**
 * LENTO e perigoso: resolve 27+ grupos no event loop do servidor e pode travar o Hermes
 * inteiro por ~8 s numa leitura síncrona ao portal da Nous. Regras, todas obrigatórias:
 * sirva do Cache primeiro, corte em 12 s, e **nunca** chame em segundo plano.
 */
export function listToolsets(signal?: AbortSignal): Promise<T.ToolsetListResponse> {
  return requestJson<T.ToolsetListResponse>({ path: "/v1/toolsets", timeoutMs: TOOLSETS_TIMEOUT_MS, signal });
}

/**
 * Não existe campo "disponível" no `/v1/toolsets`: derive de `enabled` × `configured`.
 * `configured: true` significa "tem credencial", e não "não precisa de configuração".
 */
export function toolsetAvailability(toolset: T.Toolset): ToolsetAvailability {
  if (toolset.enabled && toolset.configured) return "disponivel";
  if (toolset.enabled && !toolset.configured) return "precisa_configurar";
  if (!toolset.enabled && toolset.configured) return "desligado";
  return "indisponivel";
}

/* ─────────────────────────  Jobs (automações)  ────────────────────────── */

const JOB_ID_RE = /^[a-f0-9]{12}$/;
const DURATION_RE = /^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i;
const CRON_FIELD_RE = /^[\d*\-,/]+$/;

export function isValidJobId(jobId: string): boolean {
  return JOB_ID_RE.test(jobId);
}

/**
 * Validação local obrigatória: um schedule inválido vaza como 500 no servidor
 * (armadilha 35), o que viraria "erro interno" para o usuário.
 * `@daily`, `MON` e linguagem natural NÃO são aceitos.
 */
export function validateSchedule(raw: string): { ok: true } | { ok: false; reason: string } {
  const value = raw.trim();
  if (value === "") return { ok: false, reason: "Say when the automation should run." };

  if (value.toLowerCase().startsWith("every ")) {
    return DURATION_RE.test(value.slice(6).trim())
      ? { ok: true }
      : { ok: false, reason: "Use for example: every 30m, every 2h, every 1d." };
  }

  const parts = value.split(/\s+/);
  if (parts.length >= 5 && parts.slice(0, 5).every((part) => CRON_FIELD_RE.test(part))) return { ok: true };

  if (value.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return Number.isNaN(Date.parse(value.replace("Z", "+00:00")))
      ? { ok: false, reason: "That date and time are not valid. Use 2026-06-01T09:00:00." }
      : { ok: true };
  }

  if (DURATION_RE.test(value)) return { ok: true };

  return {
    ok: false,
    reason: "Accepted formats: 30m · 2h · 1d (once) · every 30m (repeating) · 0 9 * * * (cron) · 2026-06-01T09:00:00.",
  };
}

/**
 * SEMPRE com `include_disabled=true`: sem isso as automações pausadas somem da
 * lista. D-04: este servidor traz `capabilities.features.jobs_admin === false`
 * embora as rotas existam — não use a capability como gate; trate o 501
 * "Cron module not available" como indisponível (armadilha 34).
 */
export function listJobs(includeDisabled = true, signal?: AbortSignal): Promise<T.JobListResponse> {
  return requestJson<T.JobListResponse>({
    path: "/api/jobs",
    query: includeDisabled ? { include_disabled: "true" } : undefined,
    signal,
  });
}

export function getJob(jobId: string, signal?: AbortSignal): Promise<T.JobEnvelope> {
  return requestJson<T.JobEnvelope>({ path: `/api/jobs/${encodeURIComponent(jobId)}`, signal });
}

export interface CreateJobInput {
  /** Obrigatório, ≤200 chars. */
  name: string;
  /** Obrigatório e STRING (a resposta devolve objeto). */
  schedule: string;
  /** ≤5000 chars, passa por varredura de ameaça no servidor. */
  prompt?: string;
  /** Default "local": `deliver:"origin"` em job criado via REST não entrega nada. */
  deliver?: string;
  skills?: string[];
  /** Inteiro ≥1. */
  repeat?: number;
}

/** POST /api/jobs → 200 (não 201). Apenas estes 6 campos são lidos. */
export function createJob(input: CreateJobInput, signal?: AbortSignal): Promise<T.JobEnvelope> {
  const schedule = validateSchedule(input.schedule);
  if (!schedule.ok) {
    throw new HermesValidationError({
      userMessage: schedule.reason,
      technical: `validateSchedule rejected the value before sending (the server would answer 500).`,
      recovery: "change_input",
    });
  }
  return requestJson<T.JobEnvelope>({
    method: "POST",
    path: "/api/jobs",
    body: {
      name: input.name,
      schedule: input.schedule,
      prompt: input.prompt ?? "",
      deliver: input.deliver ?? "local",
      ...(input.skills && input.skills.length > 0 ? { skills: input.skills } : {}),
      ...(input.repeat !== undefined ? { repeat: input.repeat } : {}),
    },
    signal,
  });
}

export interface UpdateJobInput {
  name?: string;
  schedule?: string;
  prompt?: string;
  deliver?: string;
  skills?: string[];
  enabled?: boolean;
}

/**
 * Armadilha 38: `repeat` NUNCA pode ir num PATCH — o servidor grava o inteiro cru
 * onde o resto do código espera `{times, completed}` e a próxima execução quebra.
 */
export function updateJob(jobId: string, patch: UpdateJobInput, signal?: AbortSignal): Promise<T.JobEnvelope> {
  const body: Record<string, unknown> = { ...patch };
  delete body.repeat;
  return requestJson<T.JobEnvelope>({
    method: "PATCH",
    path: `/api/jobs/${encodeURIComponent(jobId)}`,
    body,
    signal,
  });
}

export function deleteJob(jobId: string, signal?: AbortSignal): Promise<T.JobDeletedResponse> {
  return requestJson<T.JobDeletedResponse>({
    method: "DELETE",
    path: `/api/jobs/${encodeURIComponent(jobId)}`,
    signal,
  });
}

/** Use pause/resume — `PATCH {enabled:false}` deixa o job "morto silencioso". */
export function pauseJob(jobId: string, signal?: AbortSignal): Promise<T.JobEnvelope> {
  return requestJson<T.JobEnvelope>({ method: "POST", path: `/api/jobs/${encodeURIComponent(jobId)}/pause`, signal });
}

export function resumeJob(jobId: string, signal?: AbortSignal): Promise<T.JobEnvelope> {
  return requestJson<T.JobEnvelope>({ method: "POST", path: `/api/jobs/${encodeURIComponent(jobId)}/resume`, signal });
}

/** NÃO executa agora: só marca `next_run_at = agora`; o ticker roda a cada ~60 s. */
export function queueJobRun(jobId: string, signal?: AbortSignal): Promise<T.JobEnvelope> {
  return requestJson<T.JobEnvelope>({ method: "POST", path: `/api/jobs/${encodeURIComponent(jobId)}/run`, signal });
}
