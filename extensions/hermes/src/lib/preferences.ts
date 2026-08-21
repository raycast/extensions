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
 * Normaliza uma base URL do Hermes:
 * - remove barras finais;
 * - reescreve `localhost`/`::1` para `127.0.0.1` (a porta do API Server escuta só IPv4
 *   e o Node pode resolver `localhost` para `::1`, dando ECONNREFUSED com o Hermes no ar);
 * - assume `http://` quando o usuário digita apenas `127.0.0.1:8642`.
 */
export function normalizeBaseUrl(input: string): string | undefined {
  const raw = input.trim();
  if (raw === "") return undefined;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return undefined;
  }
  if (url.hostname === "localhost" || url.hostname === "::1" || url.hostname === "[::1]") {
    url.hostname = "127.0.0.1";
  }
  return `${url.protocol}//${url.host}${url.pathname}`.replace(/\/+$/, "");
}

export function getHermesPreferences(): HermesPreferences {
  const raw = getPreferenceValues<RawPreferences>();
  const parsedLimit = Number.parseInt(raw.maxHistoryItems ?? String(MAX_HISTORY_FALLBACK), 10);
  const maxHistoryItems = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : MAX_HISTORY_FALLBACK;

  return {
    apiUrl: raw.apiUrl ? normalizeBaseUrl(raw.apiUrl) : undefined,
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
