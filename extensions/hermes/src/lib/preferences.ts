/**
 * Leitura centralizada e tipada das preferências (docs/ARCHITECTURE.md §5).
 *
 * Este é o único módulo que enxerga a `API_SERVER_KEY`, e ela só sai daqui por
 * `resolveApiKey()` / `requireApiKey()`, para virar o header `Authorization` em
 * `hermes-api.ts`. `getHermesPreferences()` deliberadamente NÃO devolve a chave:
 * quem só precisa da porta ou do modelo padrão nunca chega perto dela.
 *
 * Todas as preferências do manifest são `required: false`, inclusive a chave. Com
 * `required: true` o Raycast intercepta o comando numa tela nativa de preenchimento
 * ANTES do nosso onboarding, matando a tela de boas-vindas (UX-SPEC §3.4). A
 * obrigatoriedade é aplicada aqui, em código, com mensagem em pt-BR.
 */

import { getPreferenceValues } from "@raycast/api";
import { HermesNotConfiguredError, registerSecret } from "./errors";
import { type UiPlatform, toUiPlatform } from "./platform";
import { readDetectedApiKey } from "./storage";
import type { EndpointSource } from "./discovery";

/** Forma gerada em `raycast-env.d.ts` a partir do manifest; redeclarada aqui para clareza. */
interface RawPreferences {
  /** `required: false` e sem `default` ⇒ o campo sai como opcional. */
  apiServerKey?: string;
  apiUrl?: string;
  sessionKey?: string;
  defaultProvider?: string;
  defaultModel?: string;
  streamResponses?: boolean;
  maxHistoryItems?: string;
}

export interface HermesPreferences {
  /** `undefined` ⇒ usar a auto-descoberta. Já normalizado (sem barra final, IPv4). */
  apiUrl?: string;
  /**
   * Host que o usuário digitou e que foi RECUSADO por não ser a própria máquina.
   *
   * Quando isto está preenchido, `apiUrl` fica `undefined` — mas a descoberta NÃO pode
   * cair na busca automática como se o campo estivesse em branco: quem digitou um
   * endereço externo precisa ler na tela por que ele foi recusado. Ver `resolveBaseUrl`
   * em `discovery.ts`, que para aqui e lança.
   */
  rejectedApiUrlHost?: string;
  /** Sempre preenchido; em branco cai no padrão do sistema. Máx. 256 chars. */
  sessionKey: string;
  defaultProvider?: string;
  defaultModel?: string;
  streamResponses: boolean;
  /** Inteiro 1..200 (200 é o teto real de `GET /api/sessions`). */
  maxHistoryItems: number;
}

/**
 * O escopo de memória padrão, por sistema.
 *
 * **`raycast:windows:default` continua sendo o valor do Windows, letra por letra.** Ele é
 * o identificador que o Hermes usa para separar a memória de longo prazo desta origem:
 * mudá-lo não apaga nada, mas faz a extensão passar a escrever e ler em outro escopo — a
 * memória antiga fica órfã. Por isso não há migração aqui, e não pode haver.
 *
 * O manifest deliberadamente **não** declara `default` para `sessionKey`. Se declarasse,
 * o Raycast injetaria o mesmo literal em toda instalação e não haveria como distinguir
 * "o usuário escolheu este valor" de "veio do manifest" — trocar o padrão migraria, em
 * silêncio, todo mundo que nunca tocou no campo. Com o campo vazio, quem resolve é esta
 * função, e o resultado no Windows é exatamente o de antes:
 *
 *   - campo preenchido pelo usuário → vence sempre, nos dois sistemas;
 *   - campo vazio no Windows        → `raycast:windows:default` (o de sempre);
 *   - campo vazio no macOS          → `raycast:macos:default` (instalação nova, escopo novo).
 *
 * Quem quiser a MESMA memória nas duas máquinas escreve o mesmo valor nos dois Raycasts —
 * é uma escolha explícita, e continua sendo do usuário.
 */
export function defaultSessionKey(platform: UiPlatform = toUiPlatform()): string {
  return platform === "macos" ? "raycast:macos:default" : "raycast:windows:default";
}

const MAX_HISTORY_FALLBACK = 50;

/**
 * Só a própria máquina: `127.0.0.0/8`, `::1` e `localhost`.
 *
 * O `hostname` chega aqui já normalizado pelo `URL` do Node, e é por isso que a checagem
 * pode ser esta comparação curta: o parser resolve as formas abreviadas de IPv4
 * (`127.1`, `2130706433`, `0x7f.0.0.1` viram todas `127.0.0.1`), comprime o IPv6
 * (`[0:0:0:0:0:0:0:1]` vira `[::1]`), converte IDN para punycode (um `localhost` com
 * cirílico não passa por `localhost`) e descarta o userinfo — `http://127.0.0.1@exemplo.com`
 * tem `hostname === "exemplo.com"`, que é o host para onde a requisição realmente iria.
 *
 * Formas exóticas mas legítimas de loopback (`::ffff:127.0.0.1`) são recusadas de
 * propósito: falhar fechado custa ao usuário reescrever o endereço como `127.0.0.1`.
 */
export function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (host === "localhost" || host === "::1") return true;
  const octets = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  return octets !== null && octets.slice(1).every((octet) => Number(octet) <= 255);
}

/** Por que uma base URL digitada foi recusada. */
export type BaseUrlRefusal = "malformed" | "not-loopback";

export interface BaseUrlCheck {
  /** Base URL normalizada. `undefined` quando o campo estava vazio ou foi recusado. */
  baseUrl?: string;
  /** `undefined` quando aceitou — ou quando o campo estava vazio, que não é recusa. */
  refusal?: BaseUrlRefusal;
  /** Host recusado, já normalizado pelo `URL`. Só existe em `refusal === "not-loopback"`. */
  host?: string;
}

/**
 * Normaliza uma base URL do Hermes e diz se ela é aceitável:
 * - remove barras finais;
 * - reescreve `localhost`/`::1` para `127.0.0.1` (a porta do API Server escuta só IPv4
 *   e o Node pode resolver `localhost` para `::1`, dando ECONNREFUSED com o Hermes no ar);
 * - assume `http://` quando o usuário digita apenas `127.0.0.1:8642`;
 * - RECUSA qualquer host que não seja loopback.
 *
 * A recusa é de segurança, não de estilo: `hermes-api.ts` põe `Authorization: Bearer
 * <API_SERVER_KEY>` em toda requisição, então um host externo aqui entregaria a chave do
 * Hermes a um terceiro. A porta continua livre — é para isso que o campo existe.
 */
export function checkBaseUrl(input: string): BaseUrlCheck {
  const raw = input.trim();
  if (raw === "") return {};
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { refusal: "malformed" };
  }
  if (!isLoopbackHost(url.hostname)) return { refusal: "not-loopback", host: url.hostname };
  // Só os nomes: um `127.0.0.5` explícito é loopback e continua sendo o que o usuário pediu.
  if (url.hostname === "localhost" || url.hostname === "::1" || url.hostname === "[::1]") {
    url.hostname = "127.0.0.1";
  }
  return { baseUrl: `${url.protocol}//${url.host}${url.pathname}`.replace(/\/+$/, "") };
}

/** Atalho de `checkBaseUrl()` para quem só quer o endereço utilizável. */
export function normalizeBaseUrl(input: string): string | undefined {
  return checkBaseUrl(input).baseUrl;
}

export function getHermesPreferences(): HermesPreferences {
  const raw = getPreferenceValues<RawPreferences>();
  const parsedLimit = Number.parseInt(raw.maxHistoryItems ?? String(MAX_HISTORY_FALLBACK), 10);
  const maxHistoryItems = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : MAX_HISTORY_FALLBACK;
  const address = raw.apiUrl ? checkBaseUrl(raw.apiUrl) : {};

  return {
    apiUrl: address.baseUrl,
    rejectedApiUrlHost: address.refusal === "not-loopback" ? address.host : undefined,
    sessionKey: (raw.sessionKey?.trim() || defaultSessionKey()).slice(0, 256),
    defaultProvider: raw.defaultProvider?.trim() || undefined,
    defaultModel: raw.defaultModel?.trim() || undefined,
    streamResponses: raw.streamResponses !== false,
    maxHistoryItems,
  };
}

/* ─────────────────────── Chave de acesso ─────────────────────── */

export type ApiKeySource = "preference" | "detected" | "none";

export interface ResolvedApiKey {
  /** String vazia quando `source === "none"`. NUNCA logar, serializar ou exibir. */
  key: string;
  source: ApiKeySource;
}

/**
 * Ordem de resolução (UX-SPEC §3.3): preferência > chave detectada > nada.
 * A preferência sempre vence — se o usuário digitou algo, é a intenção mais recente.
 *
 * Toda chave resolvida é registrada em `registerSecret()`, que é o que garante a
 * passada LITERAL da §5.1 regra 5 nos blocos de detalhes técnicos montados em render
 * síncrono. O registro é só para APAGAR o valor: nada o lê de volta.
 */
export async function resolveApiKey(): Promise<ResolvedApiKey> {
  const fromPreference = (getPreferenceValues<RawPreferences>().apiServerKey ?? "").trim();
  if (fromPreference !== "") {
    registerSecret(fromPreference);
    return { key: fromPreference, source: "preference" };
  }

  const detected = await readDetectedApiKey();
  if (detected !== undefined) {
    registerSecret(detected);
    return { key: detected, source: "detected" };
  }

  return { key: "", source: "none" };
}

/** `false` ⇒ o comando deve renderizar a tela de boas-vindas em vez de chamar o Hermes. */
export async function isConfigured(): Promise<boolean> {
  return (await resolveApiKey()).source !== "none";
}

/** Chamar no topo de toda requisição ao Hermes. */
export async function requireApiKey(): Promise<string> {
  const { key } = await resolveApiKey();
  if (key === "") {
    throw new HermesNotConfiguredError({
      userMessage: "Connect Raycast to Hermes: enter the API Server key.",
      technical: "No key available: the apiServerKey preference is empty and nothing was detected locally.",
      recovery: "open_preferences",
    });
  }
  return key;
}

/* ─────────────────────── Configuração resolvida ─────────────────────── */

export interface HermesConfig {
  /** Ex.: "http://127.0.0.1:8642", sem barra final. */
  baseUrl: string;
  version: string;
  endpointSource: EndpointSource;
  /** NUNCA logar, serializar ou exibir. */
  apiKey: string;
  keySource: Exclude<ApiKeySource, "none">;
}

/**
 * Endereço + chave prontos para uso. Lança `HermesNotConfiguredError` sem chave e
 * os erros de `resolveBaseUrl()` quando o Hermes não responde.
 *
 * O `import` de `discovery.ts` é tardio de propósito: `discovery.ts` importa este
 * módulo para ler a preferência `apiUrl`, e um import estático nos dois sentidos
 * criaria um ciclo. Aqui o tipo vem por `import type` (apagado) e o valor só é
 * carregado na primeira chamada.
 */
export async function resolveHermesConfig(): Promise<HermesConfig> {
  const { key, source } = await resolveApiKey();
  if (source === "none") {
    throw new HermesNotConfiguredError({
      userMessage: "Connect Raycast to Hermes: enter the API Server key.",
      technical: "No key available: the apiServerKey preference is empty and nothing was detected locally.",
      recovery: "open_preferences",
    });
  }

  const { resolveBaseUrl } = await import("./discovery");
  const endpoint = await resolveBaseUrl();

  return {
    baseUrl: endpoint.baseUrl,
    version: endpoint.version,
    endpointSource: endpoint.source,
    apiKey: key,
    keySource: source,
  };
}
