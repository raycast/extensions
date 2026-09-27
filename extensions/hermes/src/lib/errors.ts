/**
 * errors.ts — modelo de erros do cliente Hermes.
 *
 * Três garantias que este módulo existe para dar:
 *
 * 1. A escolha do texto vem de `status` + `error.code` / `error.type`. NUNCA da
 *    string `error.message`: o servidor redige essa mensagem e ela muda entre
 *    versões (pesquisa 01 §1.4). Onde o envelope é o legado `{"error": "texto"}`,
 *    que não tem `code` nenhum, o discriminador é a ROTA — e isso está marcado
 *    caso a caso abaixo.
 * 2. Nenhum texto técnico sai daqui sem passar por `sanitizeTechnical()`.
 * 3. Corpo desconhecido, vazio ou ilegível vira um erro genérico seguro. Este
 *    módulo nunca lança exceção própria.
 *
 * Não importa `./types` de propósito: o parser não confia na forma do fio, ele
 * estreita tudo estruturalmente. Isso mantém `errors.ts` compilável e testável
 * sozinho, sem acoplar a fase que escreve os tipos.
 *
 * Fontes: ARCHITECTURE.md §4 (taxonomia, ações, retry) e UX-SPEC.md §5 (frases
 * literais em pt-BR e os identificadores E1..E26). Onde as duas divergem, a
 * frase literal da UX-SPEC prevalece, porque é ela que o usuário lê. Ela está em inglês
 * desde a tradução da interface; a UX-SPEC continua descrevendo a intenção, em português.
 */

/* ─────────────────────────── Ações de recuperação ─────────────────────────── */

export type RecoveryAction =
  | "open_preferences"
  | "retry"
  | "wait_and_retry"
  | "start_hermes"
  | "reload_list"
  | "change_input"
  | "reduce_size"
  | "report_bug"
  | "none";

/** Rótulos dos botões — para a UI não inventar variações (princípio 9 do brief). */
export const RECOVERY_LABEL: Record<RecoveryAction, string | null> = {
  open_preferences: "Open Settings",
  retry: "Try Again",
  wait_and_retry: "Try Again",
  start_hermes: "Check Hermes",
  reload_list: "Refresh",
  change_input: "Edit and Send Again",
  reduce_size: "Shorten the Text",
  report_bug: "Copy Technical Details",
  none: null,
};

/**
 * Identificador da linha do catálogo da UX-SPEC §5.2. A UI usa isto para decidir
 * a superfície (§5.3): E1, E2, E3, E5 e E6 tomam a tela inteira; o resto é Toast.
 *
 * Ficam de fora os ids que não nascem aqui: E4 (tela de primeiro uso), E21/E22/E23
 * (nascem dentro do stream, em `hermes-events.ts`) e E26 (leitura do `.env`, em
 * `discovery.ts`).
 */
export type UxErrorId =
  | "E1"
  | "E2"
  | "E3"
  | "E5"
  | "E6"
  | "E7"
  | "E8"
  | "E9"
  | "E10"
  | "E11"
  | "E12"
  | "E13"
  | "E14"
  | "E15"
  | "E16"
  | "E17"
  | "E18"
  | "E19"
  | "E20"
  | "E24"
  | "E25";

/* ──────────────────────────────── Redação ──────────────────────────────── */

const MAX_TECHNICAL_CHARS = 4000;

/** Marcador exigido pela UX-SPEC §5.1 regra 5. */
export const REDACTED_SECRET = "[key redacted]";

/**
 * Nomes que, seguidos de `:` ou `=`, indicam um valor secreto. A lista é casada
 * com `\b` nos dois lados, então `input_tokens`, `total_tokens` e `code=` passam
 * ilesos — o que importa, porque `technical` carrega justamente esses campos.
 */
const CREDENTIAL_NAMES =
  "api[_-]?server[_-]?key|apiserverkey|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|bearer[_-]?token|token|secret|password|senha|chave|key";

const BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
/** Um dump de headers traz a linha inteira; apaga-se o valor, não o nome. */
const AUTHORIZATION_LINE_RE = /^([ \t]*Authorization[ \t]*:).*$/gim;
const CREDENTIAL_ASSIGNMENT_RE = new RegExp(
  `(["']?\\b(?:${CREDENTIAL_NAMES})\\b["']?\\s*[:=]\\s*)(?:"[^"]*"|'[^']*'|[^\\s,;&"'}\\]]+)`,
  "gi",
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Segredos já resolvidos nesta execução do comando, para a passada LITERAL da §5.1
 * regra 5 ("substituir qualquer ocorrência da chave").
 *
 * Existe porque `resolveApiKey()` é assíncrona e a maioria dos blocos de detalhes
 * técnicos é montada em render síncrono: sem este registro, `ask.tsx`,
 * `run-progress.tsx` e `session-detail.tsx` só teriam as heurísticas `Bearer …` /
 * `chave=…`, e um eco do valor CRU da chave (ex.: `KeyError: '9f3a…'`) passaria.
 *
 * SEGURANÇA: o conjunto vive só em memória, é privado do módulo, nunca é exportado,
 * serializado nem exibido — o único uso possível de um valor daqui é ser APAGADO.
 */
const registeredSecrets = new Set<string>();

/**
 * Registra um segredo para redação futura. Chamado por `preferences.resolveApiKey()`,
 * o único ponto da extensão que enxerga a `API_SERVER_KEY`.
 */
export function registerSecret(value: string): void {
  const trimmed = value.trim();
  // Valores curtos casariam com texto legítimo e destruiriam o detalhe.
  if (trimmed.length < 6) return;
  registeredSecrets.add(trimmed);
}

/**
 * Remove qualquer credencial de um texto antes de exibi-lo ou copiá-lo.
 *
 * Roda SEMPRE, mesmo sem `secrets` — a UX-SPEC §5.1 regra 5 proíbe pular o filtro
 * quando a chave não está carregada. Além dos `secrets` recebidos, apaga tudo o que
 * já passou por `registerSecret()`, de modo que a passada literal aconteça mesmo em
 * quem monta o bloco sem poder aguardar `resolveApiKey()`.
 *
 * Não redige blobs por entropia de propósito: `run_e4118ab9...` e
 * `api_1787173253_21269392` são identificadores públicos e úteis no diagnóstico.
 */
export function sanitizeTechnical(text: string, secrets: readonly string[] = []): string {
  let out = text;

  for (const secret of [...secrets, ...registeredSecrets]) {
    const trimmed = secret.trim();
    // Valores curtos demais casariam com texto legítimo e destruiriam o detalhe.
    if (trimmed.length < 6) continue;
    out = out.replace(new RegExp(escapeRegExp(trimmed), "g"), REDACTED_SECRET);
  }

  out = out
    .replace(BEARER_RE, "Bearer ***")
    .replace(AUTHORIZATION_LINE_RE, "$1 ***")
    .replace(CREDENTIAL_ASSIGNMENT_RE, "$1***");

  return out.length > MAX_TECHNICAL_CHARS ? `${out.slice(0, MAX_TECHNICAL_CHARS)}…` : out;
}

/* ──────────────────────────── Classes de erro ──────────────────────────── */

export interface HermesErrorInit {
  /** Em inglês, sem jargão. É o que aparece no Toast/Detail. */
  userMessage: string;
  /** Detalhe para "Copiar detalhes técnicos". Oculto por padrão. */
  technical: string;
  recovery: RecoveryAction;
  retryable?: boolean;
  httpStatus?: number;
  code?: string | null;
  type?: string | null;
  uxId?: UxErrorId;
  cause?: unknown;
}

export class HermesError extends Error {
  readonly userMessage: string;
  readonly technical: string;
  readonly recovery: RecoveryAction;
  readonly retryable: boolean;
  readonly httpStatus?: number;
  readonly code: string | null;
  readonly type: string | null;
  readonly uxId?: UxErrorId;

  constructor(init: HermesErrorInit) {
    // `message` recebe o texto do usuário: se alguém logar o erro cru, sai o texto
    // de tela e não um corpo HTTP.
    super(init.userMessage, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = new.target.name;
    this.userMessage = init.userMessage;
    this.technical = sanitizeTechnical(init.technical);
    this.recovery = init.recovery;
    this.retryable = init.retryable ?? false;
    this.httpStatus = init.httpStatus;
    this.code = init.code ?? null;
    this.type = init.type ?? null;
    this.uxId = init.uxId;
  }

  /** Rótulo do botão principal, ou null quando não há ação a oferecer. */
  get recoveryLabel(): string | null {
    return RECOVERY_LABEL[this.recovery];
  }

  /** Apelido de `httpStatus`. Existe porque o retry de `hermes-api.ts` lê `.status`. */
  get status(): number | undefined {
    return this.httpStatus;
  }
}

export class HermesNotConfiguredError extends HermesError {}
export class HermesConnectionError extends HermesError {}
export class HermesTimeoutError extends HermesError {}
export class HermesAbortError extends HermesError {}
export class HermesAuthError extends HermesError {}
export class HermesOriginBlockedError extends HermesError {}
export class HermesForbiddenError extends HermesError {}
export class HermesNotFoundError extends HermesError {}
export class HermesValidationError extends HermesError {}
export class HermesScheduleError extends HermesValidationError {}
export class HermesConflictError extends HermesError {}
export class HermesPayloadTooLargeError extends HermesError {}
export class HermesJobRegistrationError extends HermesError {}
export class HermesServerError extends HermesError {}
export class HermesNotSupportedError extends HermesError {}
export class HermesProtocolError extends HermesError {}
export class HermesWrongServerError extends HermesError {}

export class HermesRateLimitError extends HermesError {
  readonly retryAfterSeconds: number;
  constructor(init: HermesErrorInit & { retryAfterSeconds: number }) {
    super(init);
    this.retryAfterSeconds = init.retryAfterSeconds;
  }
}

export class HermesUnavailableError extends HermesError {
  readonly retryAfterSeconds: number;
  constructor(init: HermesErrorInit & { retryAfterSeconds?: number }) {
    super(init);
    this.retryAfterSeconds = init.retryAfterSeconds ?? 1;
  }
}

/* ─────────────────────── Parsing do corpo de erro ─────────────────────── */

const MAX_RAW_CHARS = 2000;
const MAX_FALLBACK_MESSAGE_CHARS = 300;

export interface ParsedErrorBody {
  message?: string;
  type?: string;
  code?: string | null;
  /** Corpo cru, truncado. */
  raw: string;
  /** true quando o corpo estava vazio — a assinatura do 403 de CORS. */
  empty: boolean;
}

/** Estreita `unknown` para um objeto indexável. Arrays e null ficam de fora. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Lê o corpo de erro sem nunca lançar. Cobre os três envelopes vistos no fio:
 * `{"error":{...}}` (OpenAI), `{"error":"texto"}` (jobs e prefixo de perfil) e
 * texto puro (`404: Not Found` do aiohttp).
 */
export function parseErrorBody(raw: string): ParsedErrorBody {
  const text = raw ?? "";
  if (text.trim() === "") return { raw: "", empty: true };

  const generic: ParsedErrorBody = {
    message: text.slice(0, MAX_FALLBACK_MESSAGE_CHARS),
    raw: text.slice(0, MAX_RAW_CHARS),
    empty: false,
  };

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return generic; // corpo não-JSON, ex.: "404: Not Found" em text/plain
  }

  const root = asRecord(json);
  if (!root || !("error" in root)) return generic;

  const err = root.error;
  if (typeof err === "string") {
    return { message: err, raw: text.slice(0, MAX_RAW_CHARS), empty: false };
  }

  const envelope = asRecord(err);
  if (!envelope) return generic; // `{"error": null}` / `{"error": 42}` não quebram nada

  return {
    message: typeof envelope.message === "string" ? envelope.message : undefined,
    type: typeof envelope.type === "string" ? envelope.type : undefined,
    code: typeof envelope.code === "string" ? envelope.code : null,
    raw: text.slice(0, MAX_RAW_CHARS),
    empty: false,
  };
}

/**
 * Mensagens literais das rotas de jobs (envelope `{"error": "..."}`, sem `code`).
 * As duas chaves com "≤" usam o caractere U+2264 do servidor, não "<=".
 */
const JOB_FIELD_MESSAGES: Record<string, string> = {
  "Name is required": "Give the automation a name.",
  "Name must be ≤ 200 characters": "The automation name can have at most 200 characters.",
  "Schedule is required": "Say when the automation should run.",
  "Prompt must be ≤ 5000 characters": "The automation instruction can have at most 5000 characters.",
  "Repeat must be a positive integer": "The number of repeats has to be a whole number above zero.",
  "No valid fields to update": "There is nothing to save.",
  "Invalid job ID format": "That automation identifier is not valid.",
};

/* ───────────────────────── Mapeamento HTTP → erro ───────────────────────── */

export interface HttpErrorContext {
  method: string;
  /** Caminho SEM baseUrl. Nunca inclua headers. */
  path: string;
  status: number;
  retryAfter?: string | null;
  body: string;
}

function retryAfterSeconds(header: string | null | undefined): number {
  const parsed = Number.parseInt(header ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** Converte uma resposta HTTP sem sucesso no erro tipado correspondente. */
export function mapHttpError(ctx: HttpErrorContext): HermesError {
  const parsed = parseErrorBody(ctx.body);
  const code = parsed.code ?? undefined;
  const msg = parsed.message ?? "";
  const where = `${ctx.method} ${ctx.path} → HTTP ${ctx.status}`;
  const base = {
    technical: `${where}\ncode=${code ?? "-"} type=${parsed.type ?? "-"}\n${parsed.raw}`,
    httpStatus: ctx.status,
    code: parsed.code ?? null,
    type: parsed.type ?? null,
  };
  const wait = retryAfterSeconds(ctx.retryAfter);

  switch (ctx.status) {
    case 401:
      if (ctx.path.startsWith("/api/jobs")) {
        return new HermesNotConfiguredError({
          ...base,
          userMessage: "Automations need a valid Hermes setup.",
          recovery: "open_preferences",
          uxId: "E2",
        });
      }
      // Único code observado: gateway_auth_failed / gateway_auth_error.
      return new HermesAuthError({
        ...base,
        userMessage: "Hermes did not accept the access key. It may have changed since the last time.",
        recovery: "open_preferences",
        uxId: "E2",
      });

    case 403:
      if (parsed.empty) {
        // Corpo vazio = middleware de CORS. Só acontece se alguém mandou Origin.
        return new HermesOriginBlockedError({
          ...base,
          technical:
            `${where}\nEmpty body: the CORS middleware rejected the request because an ` +
            `Origin header was sent. No request from this client may set Origin.`,
          userMessage: "Could not talk to Hermes because of a security restriction on the server.",
          recovery: "report_bug",
          uxId: "E5",
        });
      }
      // Este 403 não tem `code`; o `type` é invalid_request_error para os dois
      // casos, então o discriminador possível é o texto do servidor.
      if (msg.includes("requires API key authentication")) {
        return new HermesForbiddenError({
          ...base,
          userMessage: "Hermes is running with no access key set up, and it does not accept this kind of request.",
          recovery: "open_preferences",
          uxId: "E6",
        });
      }
      return new HermesForbiddenError({
        ...base,
        userMessage: "Hermes blocked this operation.",
        recovery: "open_preferences",
      });

    case 404:
      if (code === "session_not_found") {
        return new HermesNotFoundError({
          ...base,
          userMessage: "This conversation no longer exists in Hermes. It may have been deleted in Hermes Desktop.",
          recovery: "reload_list",
          uxId: "E7",
        });
      }
      if (code === "run_not_found") {
        // E9: a mesma condição na abertura do stream é um aviso, não uma perda.
        if (ctx.path.endsWith("/events")) {
          return new HermesNotFoundError({
            ...base,
            userMessage: "I lost the live view of this task, but it is still going inside Hermes.",
            recovery: "retry",
            retryable: true,
            uxId: "E9",
          });
        }
        return new HermesNotFoundError({
          ...base,
          userMessage:
            "Hermes no longer has any information about this task. It may have finished normally, or Hermes was restarted.",
          recovery: "reload_list",
          uxId: "E8",
        });
      }
      // Envelope legado sem `code`: discrimina pela rota, não pela frase.
      if (ctx.path.startsWith("/api/jobs")) {
        return new HermesNotFoundError({
          ...base,
          userMessage: "This automation no longer exists.",
          recovery: "reload_list",
        });
      }
      if (msg.includes("Unknown or unconfigured profile")) {
        return new HermesNotFoundError({
          ...base,
          userMessage: "The profile you gave does not exist in this Hermes.",
          recovery: "open_preferences",
        });
      }
      return new HermesNotFoundError({
        ...base,
        userMessage: "Hermes could not find what was asked for.",
        recovery: "report_bug",
      });

    case 400:
      if (code === "invalid_title") {
        return new HermesValidationError({
          ...base,
          userMessage: "There is already a conversation with that title. Pick another name.",
          recovery: "change_input",
          uxId: "E11",
        });
      }
      if (code === "missing_message") {
        return new HermesValidationError({
          ...base,
          userMessage: "Write a question before sending.",
          recovery: "change_input",
        });
      }
      if (code === "invalid_steer_input") {
        return new HermesValidationError({
          ...base,
          userMessage: "Write your guidance before sending.",
          recovery: "change_input",
          uxId: "E14",
        });
      }
      if (code === "invalid_pagination") {
        return new HermesValidationError({
          ...base,
          userMessage: "Could not load this part of the conversation.",
          recovery: "retry",
          retryable: true,
        });
      }
      if (code === "invalid_approval_choice") {
        return new HermesValidationError({
          ...base,
          userMessage: "That approval option is not valid.",
          recovery: "report_bug",
        });
      }
      if (code === "invalid_content_length") {
        return new HermesValidationError({
          ...base,
          userMessage: "Hermes did not understand the size of what was sent.",
          recovery: "retry",
          retryable: true,
        });
      }
      if (code === "unsupported_session_field" || code === "invalid_session_field" || code === "invalid_session_id") {
        return new HermesValidationError({
          ...base,
          userMessage: "Could not save that change to the conversation.",
          recovery: "report_bug",
        });
      }
      // As rotas de jobs respondem `{"error": "texto"}` sem `code`; aqui a frase
      // do servidor é o único discriminador que existe.
      if (msg.startsWith("Blocked: prompt matches threat pattern")) {
        return new HermesValidationError({
          ...base,
          userMessage: "This text was blocked for safety. Rewrite the automation instruction.",
          recovery: "change_input",
        });
      }
      if (JOB_FIELD_MESSAGES[msg] !== undefined) {
        return new HermesValidationError({
          ...base,
          userMessage: JOB_FIELD_MESSAGES[msg],
          recovery: "change_input",
        });
      }
      return new HermesValidationError({
        ...base,
        userMessage: "Hermes rejected the data that was sent.",
        recovery: "change_input",
      });

    case 409:
      if (code === "session_exists") {
        return new HermesConflictError({
          ...base,
          userMessage: "There is already a conversation with that identifier. I will create another one.",
          recovery: "retry",
          retryable: true,
          uxId: "E10",
        });
      }
      if (code === "model_lock_unavailable") {
        return new HermesConflictError({
          ...base,
          userMessage: "This model is not available right now. Pick another one.",
          recovery: "change_input",
        });
      }
      if (code === "approval_not_active" || code === "approval_not_pending") {
        return new HermesConflictError({
          ...base,
          userMessage: "That approval request was already answered, perhaps in another app.",
          recovery: "reload_list",
          uxId: "E12",
        });
      }
      if (code === "run_not_accepting_steer" || code === "steer_not_accepted") {
        return new HermesConflictError({
          ...base,
          userMessage: "This task cannot be guided right now. That only works while it is working.",
          recovery: "reload_list",
          uxId: "E13",
        });
      }
      return new HermesConflictError({
        ...base,
        userMessage: "Things changed in Hermes and this operation no longer applies. Refresh and try again.",
        recovery: "reload_list",
      });

    case 413:
      return new HermesPayloadTooLargeError({
        ...base,
        userMessage: "Your text is too big for Hermes to handle in one go. Try splitting it into smaller parts.",
        recovery: "reduce_size",
        uxId: "E15",
      });

    case 424:
      // A automação FOI salva. Recriar duplicaria o job — por isso `none`.
      return new HermesJobRegistrationError({
        ...base,
        userMessage: "The automation was saved but not scheduled. Pause it and resume to try again.",
        recovery: "none",
      });

    case 429:
      return new HermesRateLimitError({
        ...base,
        userMessage: "Hermes has too many tasks going at once. Wait a few seconds and try again.",
        recovery: "wait_and_retry",
        retryable: true,
        retryAfterSeconds: wait,
        uxId: "E16",
      });

    case 501:
      return new HermesNotSupportedError({
        ...base,
        userMessage: "Automations are not available in this Hermes.",
        recovery: "none",
        uxId: "E19",
      });

    case 503:
      if (code === "session_db_unavailable") {
        return new HermesUnavailableError({
          ...base,
          userMessage: "Hermes could not open the conversation database. Restart Hermes Desktop and try again.",
          recovery: "start_hermes",
          retryable: true,
          uxId: "E18",
        });
      }
      return new HermesUnavailableError({
        ...base,
        userMessage:
          "Hermes is finishing what it had already started and is not taking new requests. Try again in a moment.",
        recovery: "wait_and_retry",
        retryable: true,
        retryAfterSeconds: wait,
        uxId: "E17",
      });

    default:
      if (ctx.status >= 500) {
        // Jobs devolvem 500 com "Invalid schedule" para recorrência inválida:
        // é erro do usuário, não do servidor.
        if (msg.includes("Invalid schedule")) {
          return new HermesScheduleError({
            ...base,
            userMessage:
              "That recurrence is not valid. Accepted examples: 'every 30m', '0 9 * * *', '2h', '2026-06-01T09:00:00'.",
            recovery: "change_input",
          });
        }
        if (code === "agent_incomplete") {
          return new HermesServerError({
            ...base,
            userMessage:
              "Hermes started the task but could not finish it. Try asking again, with more detail if you can.",
            recovery: "retry",
            retryable: true,
            uxId: "E20",
          });
        }
        if (code === "model_lock_persistence_failed") {
          return new HermesServerError({
            ...base,
            userMessage: "Could not pin the model for this conversation.",
            recovery: "retry",
            retryable: true,
          });
        }
        if (code === "model_options_failed") {
          return new HermesServerError({
            ...base,
            userMessage: "Could not list the models.",
            recovery: "retry",
            retryable: true,
          });
        }
        return new HermesServerError({
          ...base,
          userMessage: "Hermes hit an internal error.",
          recovery: "retry",
          retryable: true,
        });
      }
      return new HermesProtocolError({
        ...base,
        userMessage: "Hermes answered in a way the extension did not understand.",
        recovery: "report_bug",
        uxId: "E24",
      });
  }
}

/* ────────────────────── Erros de rede / cancelamento ────────────────────── */

/** Servidor inalcançável: porta fechada, host errado, socket derrubado. */
const CONNECTION_CODES: ReadonlySet<string> = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ECONNABORTED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
  "EPIPE",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

/** Conectou, mas o Hermes não respondeu a tempo. */
const TIMEOUT_CODES: ReadonlySet<string> = new Set(["UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"]);

/**
 * `fetch` do Node embrulha a falha real: `TypeError: fetch failed` com o código
 * em `cause`, e às vezes em `cause.cause` ou dentro de um `AggregateError`.
 */
function extractNodeCode(err: unknown, depth = 0): string | undefined {
  if (depth > 5) return undefined;
  const record = asRecord(err);
  if (!record) return undefined;

  const code = record.code;
  if (typeof code === "string" && code !== "") return code;

  const aggregated = record.errors;
  if (Array.isArray(aggregated)) {
    for (const inner of aggregated) {
      const found = extractNodeCode(inner, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return extractNodeCode(record.cause, depth + 1);
}

function readString(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

/** Converte QUALQUER exceção (inclusive de `fetch`) num HermesError. */
export function toHermesError(err: unknown, context = ""): HermesError {
  if (err instanceof HermesError) return err;

  const record = asRecord(err);
  const name = readString(record, "name") ?? "Error";
  const message = readString(record, "message") ?? String(err);
  const nodeCode = extractNodeCode(err);
  const technical = `${context}\n${name}: ${message}${nodeCode !== undefined ? `\ncode=${nodeCode}` : ""}`.trim();

  if (name === "StoragePersistenceError") {
    const userMessage =
      readString(record, "userMessage") ?? "I could not save the local state of this task. Try again.";
    return new HermesServerError({
      userMessage,
      technical,
      recovery: "retry",
      retryable: true,
      cause: err,
    });
  }

  if (name === "TimeoutError" || (nodeCode !== undefined && TIMEOUT_CODES.has(nodeCode))) {
    return new HermesTimeoutError({
      userMessage: "Hermes is taking longer than expected to answer.",
      technical,
      recovery: "retry",
      retryable: true,
      uxId: "E25",
      cause: err,
    });
  }

  if (name === "AbortError" || nodeCode === "ABORT_ERR") {
    return new HermesAbortError({
      userMessage: "Operation cancelled.",
      technical,
      recovery: "none",
      cause: err,
    });
  }

  // `fetch failed` sem código legível ainda é falha de rede: o Hermes está fora.
  if (
    (nodeCode !== undefined && CONNECTION_CODES.has(nodeCode)) ||
    message === "fetch failed" ||
    message === "Failed to fetch"
  ) {
    return new HermesConnectionError({
      userMessage:
        "Could not connect to Hermes. Check that the Hermes API Server is on, and that the address and the key are right.",
      technical,
      recovery: "start_hermes",
      retryable: true,
      uxId: "E1",
      cause: err,
    });
  }

  return new HermesProtocolError({
    userMessage: "Hermes answered in a way the extension did not understand.",
    technical,
    recovery: "report_bug",
    uxId: "E24",
    cause: err,
  });
}

/** true quando o erro deve ser silenciosamente ignorado (desmontagem do comando). */
export function isAbort(err: unknown): boolean {
  if (err instanceof HermesAbortError) return true;
  return readString(asRecord(err), "name") === "AbortError";
}
