import { buildHeaders, REQUEST_TIMEOUT_MS, toHttpError, type Fetch } from "./chat-client";
import { redactErrorCause, redactSensitiveText } from "./diagnostics";
import { ProviderError } from "./errors";
import type { ProviderConfig, ProviderId } from "./providers";
import type { KeyValueStore } from "./usage";

const ANTHROPIC_VERSION = "2023-06-01";
const GEMINI_MODEL_PREFIX = "models/";

export async function listModels(fetchFn: Fetch, provider: ProviderConfig): Promise<string[]> {
  const response = await fetchFn(`${provider.baseUrl}/models`, {
    method: "GET",
    headers: modelHeaders(provider),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((error: unknown) => {
    throw new ProviderError(
      provider.id,
      "network",
      `Could not reach ${redactSensitiveText(provider.baseUrl, [provider])}.`,
      {
        cause: redactErrorCause(error, [provider]),
      },
    );
  });
  const requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id") ?? undefined;
  if (!response.ok) {
    throw await toHttpError(provider, response, requestId);
  }
  const ids = modelIds(await response.json().catch(() => undefined));
  if (ids === undefined) {
    throw new ProviderError(provider.id, "bad_response", "Response did not contain a model list.", {
      status: response.status,
      requestId,
    });
  }
  return [...new Set(ids)].toSorted();
}

export async function applyModelChoices(
  store: KeyValueStore,
  providers: readonly ProviderConfig[],
): Promise<ProviderConfig[]> {
  return Promise.all(
    providers.map(async (provider) => {
      const picked = await store.getItem(modelChoiceKey(provider.id));
      return picked ? { ...provider, model: picked } : provider;
    }),
  );
}

export function saveModelChoice(store: KeyValueStore, provider: ProviderId, model: string): Promise<void> {
  return store.setItem(modelChoiceKey(provider), model);
}

export function clearModelChoice(store: KeyValueStore, provider: ProviderId): Promise<void> {
  return store.setItem(modelChoiceKey(provider), "");
}

function modelChoiceKey(provider: ProviderId): string {
  return `model:${provider}`;
}

function modelHeaders({ id, apiKey }: ProviderConfig): Record<string, string> {
  const headers = buildHeaders(apiKey);
  if (id === "anthropic" && apiKey) {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = ANTHROPIC_VERSION;
  }
  return headers;
}

function modelIds(body: unknown): string[] | undefined {
  if (!isRecord(body) || !Array.isArray(body["data"])) {
    return undefined;
  }
  const entries: readonly unknown[] = body["data"];
  return entries.flatMap((entry) => {
    const id = isRecord(entry) ? entry["id"] : undefined;
    return typeof id === "string" ? [stripGeminiPrefix(id)] : [];
  });
}

function stripGeminiPrefix(id: string): string {
  return id.startsWith(GEMINI_MODEL_PREFIX) ? id.slice(GEMINI_MODEL_PREFIX.length) : id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
