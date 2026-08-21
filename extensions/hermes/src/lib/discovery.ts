/**
 * Descoberta ordenada do Hermes API Server (docs/ARCHITECTURE.md §6).
 *
 * Ordem exata:
 *   S0  preferência `apiUrl` preenchida → sonda e PRONTO. Sem fallback silencioso:
 *       escolha explícita do usuário manda, mesmo quando dá errado.
 *   S1  cache em LocalStorage (mesmo pid/start_time do gateway, < 12 h) → sonda rápida.
 *   S2  HERMES_HOME: env > gateway.pid.hermes_home > pasta padrão da plataforma
 *       (`%LOCALAPPDATA%\hermes` no Windows, `~/.hermes` no macOS).
 *   S3  portas candidatas: config.yaml > API_SERVER_PORT > .env > 8642.
 *   S4  `GET /health` em cada uma; aceita SÓ `status === "ok"` e `platform === "hermes-agent"`.
 *   S5  nada passou: sonda a 8644 para dar um diagnóstico preciso.
 *   S6  grava o cache.
 *
 * Duas regras que parecem detalhe e não são:
 *   - o host é SEMPRE a string literal `127.0.0.1`. O API Server escuta apenas IPv4 e o
 *     Node pode resolver `localhost` para `::1`, dando ECONNREFUSED com o Hermes no ar;
 *   - NUNCA enviar o header `Origin`. O middleware de CORS responde 403 com corpo vazio
 *     antes da autenticação — até no `/health`, que nem exige chave. O `fetch` do Node
 *     não envia `Origin` sozinho: basta não adicionar.
 *
 * Sem dependência de YAML: precisamos de um único inteiro de um arquivo de ~15 KB cujo
 * formato relevante é sempre `chave: valor` indentado com espaços. O scanner abaixo
 * degrada para `undefined` em qualquer construção que não entenda (âncoras, escalares
 * multilinha, listas), e o gate `/health` é a autoridade final — um falso negativo custa
 * no máximo uma tentativa extra na porta 8642.
 */

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { HermesConnectionError, HermesWrongServerError } from "./errors";
import { getHermesPreferences } from "./preferences";
import { readJson, StorageKeys, writeJson } from "./storage";
import type { HealthResponse } from "./types";

export const DEFAULT_PORT = 8642;
/**
 * UX-SPEC §5.2 E1 / §10.3 — frase canônica, "usar sem variação". Toda falha de conexão
 * originada aqui usa exatamente este texto: `HermesErrorEmptyView` e os Toasts exibem
 * `userMessage` cru, então uma variante local vaza para a tela.
 */
const E1_MESSAGE =
  "Could not connect to Hermes. Check that the Hermes API Server is on, and that the address and the key are right.";

/** Adaptador de webhook: responde `/health` com `platform: "webhook"`. */
const WEBHOOK_PORT = 8644;
const PROBE_TIMEOUT_MS = 1500;
const CACHE_PROBE_TIMEOUT_MS = 600;
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type EndpointSource = "preference" | "cache" | "config" | "env" | "dotenv" | "default";

export interface ResolvedEndpoint {
  /** Ex.: "http://127.0.0.1:8642" — sem barra final. */
  baseUrl: string;
  version: string;
  source: EndpointSource;
}

interface CachedEndpoint extends ResolvedEndpoint {
  gatewayPid?: number;
  gatewayStartTime?: number;
  checkedAt: number;
}

/** Injeção de dependências — só para testes. Em produção fica tudo `undefined`. */
export interface DiscoveryDeps {
  env?: NodeJS.ProcessEnv;
  /** `process.platform`. Injetável para testar as duas plataformas em qualquer máquina. */
  platform?: NodeJS.Platform;
  /** `os.homedir()`. Injetável pelo mesmo motivo. */
  homeDir?: string;
  readTextFile?: (filePath: string) => Promise<string | undefined>;
  probe?: (baseUrl: string, timeoutMs: number) => Promise<HealthResponse | undefined>;
}

let memo: ResolvedEndpoint | undefined;

/* ─────────────────────────── Probe /health ─────────────────────────── */

/** Devolve o corpo de `/health` seja qual for a plataforma; `undefined` se não respondeu. */
export async function probeHealth(baseUrl: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<HealthResponse | undefined> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" }, // NUNCA Origin
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as Partial<HealthResponse>;
    if (typeof json?.status !== "string" || typeof json?.platform !== "string") return undefined;
    return { status: json.status, platform: json.platform, version: json.version ?? "unknown" };
  } catch {
    return undefined;
  }
}

/** O gate: a 8644 também responde `/health`, mas com `platform: "webhook"`. */
export function isHermesAgent(health: HealthResponse | undefined): boolean {
  return health?.status === "ok" && health.platform === "hermes-agent";
}

/* ───────────────────── Leitura de arquivos do Hermes ───────────────── */

async function readTextSafe(filePath: string, deps?: DiscoveryDeps): Promise<string | undefined> {
  if (deps?.readTextFile) return deps.readTextFile(filePath);
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

/** O Hermes grava os arquivos com `utf-8-sig`; o Node entrega o BOM (U+FEFF) literal. */
function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

/** `%LOCALAPPDATA%`, com o fallback que o próprio Windows usaria. Só faz sentido no Windows. */
export function resolveLocalAppData(env: NodeJS.ProcessEnv = process.env, homeDir: string = homedir()): string {
  const localAppData = (env.LOCALAPPDATA ?? "").trim();
  return localAppData !== "" ? localAppData : path.win32.join(homeDir, "AppData", "Local");
}

/** Entradas de `defaultHermesHome()`. Tudo com valor padrão; os testes injetam o que precisam. */
export interface DefaultHermesHomeContext {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  homeDir?: string;
}

/**
 * A pasta padrão do Hermes na plataforma — o ÚLTIMO degrau da §S2, nunca o primeiro.
 *
 *   Windows: `%LOCALAPPDATA%\hermes` (fallback `<home>\AppData\Local\hermes`);
 *   macOS:   `~/.hermes`.
 *
 * Linux cai no mesmo ramo POSIX do macOS — é onde o Hermes oficial guarda os arquivos
 * fora do Windows — ainda que o Raycast não exista lá.
 *
 * `path.win32` / `path.posix` explícitos, e não `path.join`: em produção cada ramo só
 * roda no seu próprio sistema (onde os dois são idênticos), e nos testes o resultado
 * deixa de depender da máquina que está rodando a suíte — um teste do macOS passa no
 * Windows e vice-versa.
 */
export function defaultHermesHome(context: DefaultHermesHomeContext = {}): string {
  const env = context.env ?? process.env;
  const platform = context.platform ?? process.platform;
  const home = context.homeDir ?? homedir();

  if (platform === "win32") return path.win32.join(resolveLocalAppData(env, home), "hermes");
  return path.posix.join(home, ".hermes");
}

/**
 * Um arquivo dentro da pasta do Hermes, com o separador do sistema INJETADO — nunca o da
 * máquina que está executando.
 *
 * Mesma razão de `path.win32`/`path.posix` em `defaultHermesHome()`, e a regra vale para o
 * módulo inteiro: em produção cada ramo só roda no seu próprio sistema, onde os dois são
 * idênticos a `path.join`. O ganho é o teste — e aqui ele foi pago caro. Enquanto estes
 * caminhos usavam `path.join`, o separador errado aparecia tanto na chave do fixture quanto
 * no que o código procurava, e os dois erros se cancelavam: o caso do macOS passava no
 * Windows procurando por `\Users\sam\.hermes\gateway.pid`, que nenhum Mac tem. Passava por
 * construção, não por acerto.
 */
function hermesFile(hermesHome: string, name: string, deps?: DiscoveryDeps): string {
  const platform = deps?.platform ?? process.platform;
  return platform === "win32" ? path.win32.join(hermesHome, name) : path.posix.join(hermesHome, name);
}

/** HERMES_HOME → gateway.pid.hermes_home → pasta padrão da plataforma. */
export async function resolveHermesHome(deps?: DiscoveryDeps): Promise<string> {
  const env = deps?.env ?? process.env;
  const fromEnv = (env.HERMES_HOME ?? "").trim();
  if (fromEnv !== "") return fromEnv;

  const fallback = defaultHermesHome({ env, platform: deps?.platform, homeDir: deps?.homeDir });
  const pidRaw = await readTextSafe(hermesFile(fallback, "gateway.pid", deps), deps);
  if (pidRaw) {
    try {
      const parsed = JSON.parse(pidRaw) as { hermes_home?: unknown };
      if (typeof parsed.hermes_home === "string" && parsed.hermes_home.trim() !== "") return parsed.hermes_home;
    } catch {
      /* arquivo corrompido: ignora e usa o fallback */
    }
  }
  return fallback;
}

/** Identidade do gateway: chave de invalidação do cache do endpoint. */
export async function readGatewayIdentity(
  hermesHome: string,
  deps?: DiscoveryDeps,
): Promise<{ pid?: number; startTime?: number }> {
  const raw = await readTextSafe(hermesFile(hermesHome, "gateway.pid", deps), deps);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { pid?: unknown; start_time?: unknown };
    return {
      pid: typeof parsed.pid === "number" ? parsed.pid : undefined,
      startTime: typeof parsed.start_time === "number" ? parsed.start_time : undefined,
    };
  } catch {
    return {};
  }
}

/* ───────────────── Scanner YAML mínimo (sem dependência) ──────────── */

export interface YamlNode {
  value?: string;
  children: Map<string, YamlNode>;
}

/**
 * Árvore a partir de linhas `chave: valor` indentadas por espaços. Ignora comentários,
 * linhas em branco, itens de lista e qualquer coisa que não case com o padrão.
 * NÃO suporta âncoras, escalares multilinha nem listas — aceitável porque o gate
 * `/health` é a autoridade final.
 */
export function parseSimpleYaml(text: string): YamlNode {
  const root: YamlNode = { children: new Map() };
  const stack: Array<{ indent: number; node: YamlNode }> = [{ indent: -1, node: root }];

  for (const rawLine of stripBom(text).split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, " ");
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("- ")) continue;

    const match = /^(\s*)([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;

    const indent = match[1].length;
    const key = match[2];
    const value = match[3].replace(/\s+#.*$/, "").trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();

    const node: YamlNode = { children: new Map() };
    if (value !== "") node.value = value;
    stack[stack.length - 1].node.children.set(key, node);
    stack.push({ indent, node });
  }
  return root;
}

function yamlLookup(root: YamlNode, dotted: string): YamlNode | undefined {
  let node: YamlNode | undefined = root;
  for (const segment of dotted.split(".")) {
    node = node?.children.get(segment);
    if (!node) return undefined;
  }
  return node;
}

function coercePort(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const cleaned = value.replace(/^['"]|['"]$/g, "").trim();
  if (!/^\d+$/.test(cleaned)) return undefined;
  const port = Number.parseInt(cleaned, 10);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : undefined;
}

/** Os 4 caminhos que o Hermes considera equivalentes, na ordem de precedência. */
const CONFIG_PORT_PATHS = [
  "platforms.api_server.extra.port",
  "platforms.api_server.port",
  "gateway.platforms.api_server.extra.port",
  "gateway.api_server.port",
] as const;

const CONFIG_FLOW_PATHS = ["platforms.api_server.extra", "gateway.platforms.api_server.extra"] as const;

export function extractConfigPort(yamlText: string): number | undefined {
  const root = parseSimpleYaml(yamlText);
  for (const dotted of CONFIG_PORT_PATHS) {
    const port = coercePort(yamlLookup(root, dotted)?.value);
    if (port !== undefined) return port;
  }
  // Mapeamento em fluxo: `extra: {host: 127.0.0.1, port: 8642}`
  for (const dotted of CONFIG_FLOW_PATHS) {
    const inline = yamlLookup(root, dotted)?.value;
    if (inline?.startsWith("{")) {
      const flow = /(?:^|[{,\s])port\s*:\s*(\d{1,5})/.exec(inline);
      const port = coercePort(flow?.[1]);
      if (port !== undefined) return port;
    }
  }
  return undefined;
}

/* ────────────────────── Leitura pontual do .env ───────────────────── */

/**
 * Devolve o valor cru de UMA variável do `.env`, ou `undefined`.
 *
 * SEGURANÇA: função interna, sem export. As duas únicas variáveis que a extensão pode
 * pedir são `API_SERVER_PORT` e `API_SERVER_KEY`, por wrappers explícitos abaixo.
 * Nenhuma outra linha do arquivo é devolvida, propagada ou logada.
 *
 * Mesma disciplina de parsing do Hermes (`hermes_cli/config.py:3955`): ignora linhas
 * vazias e comentários, remove `export ` inicial, corta no PRIMEIRO `=` e tira aspas.
 */
function extractDotenvValue(dotenvText: string, wanted: string): string | undefined {
  for (const rawLine of stripBom(dotenvText).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = withoutExport.indexOf("=");
    if (eq === -1) continue;
    if (withoutExport.slice(0, eq).trim() !== wanted) continue;

    return withoutExport
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
  return undefined;
}

/** Só a linha `API_SERVER_PORT`. Nunca devolve nenhuma outra. */
export function extractDotenvPort(dotenvText: string): number | undefined {
  return coercePort(extractDotenvValue(dotenvText, "API_SERVER_PORT"));
}

/**
 * Só a linha `API_SERVER_KEY`. Nunca devolve nenhuma outra.
 * SEGURANÇA: o retorno é um segredo. Não logar, não colocar em mensagem de erro, não
 * gravar em `Cache`, não copiar para o clipboard. O único destino permitido é
 * `saveDetectedApiKey()` (LocalStorage criptografado) e o header `Authorization`.
 */
export function extractDotenvApiKey(dotenvText: string): string | undefined {
  const value = extractDotenvValue(dotenvText, "API_SERVER_KEY");
  return value !== undefined && value !== "" ? value : undefined;
}

/**
 * Lê `<HERMES_HOME>\.env` e devolve SOMENTE a `API_SERVER_KEY`.
 *
 * Chamar exclusivamente a partir da ação explícita "Detectar configuração
 * automaticamente" (UX-SPEC §3.1). NUNCA em background, na inicialização de um
 * comando, em `interval` ou "por conveniência". Não escreve nada em disco.
 */
export async function readApiKeyFromEnvFile(hermesHome?: string, deps?: DiscoveryDeps): Promise<string | undefined> {
  const home = hermesHome ?? (await resolveHermesHome(deps));
  const text = await readTextSafe(hermesFile(home, ".env", deps), deps);
  return text ? extractDotenvApiKey(text) : undefined;
}

/* ──────────────────────── Portas candidatas ───────────────────────── */

export interface PortCandidate {
  port: number;
  source: EndpointSource;
}

export async function buildPortCandidates(hermesHome: string, deps?: DiscoveryDeps): Promise<PortCandidate[]> {
  const env = deps?.env ?? process.env;
  const candidates: PortCandidate[] = [];

  const configText = await readTextSafe(hermesFile(hermesHome, "config.yaml", deps), deps);
  const configPort = configText ? extractConfigPort(configText) : undefined;
  if (configPort !== undefined) candidates.push({ port: configPort, source: "config" });

  const envPort = coercePort(env.API_SERVER_PORT);
  if (envPort !== undefined) candidates.push({ port: envPort, source: "env" });

  // O .env só é aberto quando as duas fontes preferenciais falharam.
  if (configPort === undefined && envPort === undefined) {
    const dotenvText = await readTextSafe(hermesFile(hermesHome, ".env", deps), deps);
    const dotenvPort = dotenvText ? extractDotenvPort(dotenvText) : undefined;
    if (dotenvPort !== undefined) candidates.push({ port: dotenvPort, source: "dotenv" });
  }

  candidates.push({ port: DEFAULT_PORT, source: "default" });

  const seen = new Set<number>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.port)) return false;
    seen.add(candidate.port);
    return true;
  });
}

function describeCandidates(candidates: PortCandidate[]): string {
  return candidates.map((candidate) => `${candidate.port} (${candidate.source})`).join(", ");
}

/* ─────────────────────────── Resolução ────────────────────────────── */

export async function resolveBaseUrl(options?: { force?: boolean; deps?: DiscoveryDeps }): Promise<ResolvedEndpoint> {
  const deps = options?.deps;
  const probe = deps?.probe ?? probeHealth;

  if (!options?.force && memo) return memo;

  // S0 — a preferência explícita vence e não tem fallback.
  const { apiUrl } = getHermesPreferences();
  if (apiUrl) {
    const health = await probe(apiUrl, PROBE_TIMEOUT_MS);
    if (isHermesAgent(health) && health) {
      memo = { baseUrl: apiUrl, version: health.version, source: "preference" };
      return memo;
    }
    if (health) {
      throw new HermesWrongServerError({
        userMessage: "The address you configured is not the Hermes API Server.",
        technical:
          `GET ${apiUrl}/health answered platform="${health.platform}", status="${health.status}". ` +
          `Expected platform="hermes-agent". Port ${WEBHOOK_PORT} is the webhook adapter.`,
        recovery: "open_preferences",
      });
    }
    throw new HermesConnectionError({
      // §10.3: E1 é frase canônica, "usar sem variação". Quem renderiza `userMessage`
      // cru (`HermesErrorEmptyView`) mostraria uma variante encurtada.
      userMessage: E1_MESSAGE,
      technical: `GET ${apiUrl}/health did not answer within ${PROBE_TIMEOUT_MS} ms.`,
      recovery: "open_preferences",
      retryable: true,
      uxId: "E1",
    });
  }

  const hermesHome = await resolveHermesHome(deps);
  const identity = await readGatewayIdentity(hermesHome, deps);

  // S1 — cache, válido só enquanto for o mesmo processo de gateway.
  if (!options?.force) {
    const cached = await readJson<CachedEndpoint>(StorageKeys.endpointCache);
    const fresh =
      cached !== undefined &&
      Date.now() - cached.checkedAt < CACHE_MAX_AGE_MS &&
      cached.gatewayPid === identity.pid &&
      cached.gatewayStartTime === identity.startTime;
    if (fresh && cached) {
      const health = await probe(cached.baseUrl, CACHE_PROBE_TIMEOUT_MS);
      if (isHermesAgent(health) && health) {
        memo = { baseUrl: cached.baseUrl, version: health.version, source: "cache" };
        return memo;
      }
    }
  }

  // S2..S4
  const candidates = await buildPortCandidates(hermesHome, deps);
  for (const candidate of candidates) {
    const baseUrl = `http://127.0.0.1:${candidate.port}`;
    const health = await probe(baseUrl, PROBE_TIMEOUT_MS);
    if (isHermesAgent(health) && health) {
      memo = { baseUrl, version: health.version, source: candidate.source };
      await writeJson<CachedEndpoint>(StorageKeys.endpointCache, {
        ...memo,
        gatewayPid: identity.pid,
        gatewayStartTime: identity.startTime,
        checkedAt: Date.now(),
      });
      return memo;
    }
  }

  // S5 — diagnóstico preciso: o Hermes pode estar no ar só com o webhook.
  const webhook = await probe(`http://127.0.0.1:${WEBHOOK_PORT}`, PROBE_TIMEOUT_MS);
  if (webhook && webhook.platform !== "hermes-agent") {
    throw new HermesWrongServerError({
      userMessage: "Hermes is running, but the API Server did not answer.",
      technical:
        `Ports tried: ${describeCandidates(candidates)}. ` +
        `Port ${WEBHOOK_PORT} answered with platform="${webhook.platform}" (the webhook adapter, ` +
        `not the API Server). Check platforms.api_server in ${hermesFile(hermesHome, "config.yaml", deps)}.`,
      recovery: "open_preferences",
    });
  }

  throw new HermesConnectionError({
    // §10.3: frase canônica de E1, sem variação. Este é o caminho NORMAL com o gateway
    // fora do ar (`rawRequest` resolve o endereço antes do `fetch`), então uma versão
    // truncada aqui seria o texto que o usuário mais lê.
    userMessage: E1_MESSAGE,
    technical: `HERMES_HOME=${hermesHome}. Ports tried: ${describeCandidates(candidates)}.`,
    recovery: "start_hermes",
    retryable: true,
    uxId: "E1",
  });
}

/** Chamar sempre que uma requisição falhar com erro de conexão (ECONNREFUSED e afins). */
export async function invalidateBaseUrl(): Promise<void> {
  memo = undefined;
  await writeJson(StorageKeys.endpointCache, undefined);
}

/* ──────────────── Deep link para o Hermes Desktop (ARCHITECTURE §6.3) ──────────────── */

/**
 * `hermes://open/<sessionId>` foca aquela conversa num Hermes Desktop já aberto (V-2,
 * confirmada ao vivo). Restrições do parser do Desktop: o id não pode conter barra, contrabarra,
 * ":" nem "..". Ids do api_server (`api_<epoch>_<8hex>`), os nossos (`raycast_<epoch>_<8hex>`)
 * e os do Desktop (8 hex) satisfazem tudo isso.
 *
 * Devolve `undefined` quando o id não é linkável — a UI OMITE a ação nesse caso, em vez de
 * oferecer um link que abriria o Desktop no lugar errado.
 *
 * MULTIPLATAFORMA: a montagem do link não tem nada de específico de sistema, e quem abre é
 * o `open()` do Raycast, que trata esquemas de URL nos dois sistemas. Quem REGISTRA o
 * esquema `hermes://` é o Hermes Desktop: no Windows pelo registro, no macOS pelo
 * `Info.plist` do app. **O caminho macOS ainda não foi exercido ao vivo** (esta base foi
 * validada em Windows 11); por isso a UI segue defensiva — a ação `Copiar identificador da
 * conversa` continua ao lado, e nada quebra se o esquema não estiver registrado.
 */
export function hermesDesktopSessionUrl(sessionId: string | undefined): string | undefined {
  if (sessionId === undefined || sessionId === "" || /[\\/:]/.test(sessionId) || sessionId.includes("..")) {
    return undefined;
  }
  return `hermes://open/${encodeURIComponent(sessionId)}`;
}
