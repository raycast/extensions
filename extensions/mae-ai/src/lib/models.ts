import { normalizeBaseUrl } from "./tools";
import { Provider } from "./stream";

export interface Model {
  id: string;
  name: string;
}

export function modelsUrl(baseUrl: string): string {
  const url = new URL(normalizeBaseUrl(baseUrl));
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname =
    path === "/api/openai/v1" ? "/api/v1/lm/chatModels" : `${path}/models`;
  return url.toString();
}

export function parseModels(payload: unknown): Model[] {
  const entries = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "data" in payload
      ? payload.data
      : undefined;
  if (!Array.isArray(entries))
    throw new Error("The provider returned an unsupported model list.");
  const copilotModels =
    Array.isArray(payload) &&
    entries.some((entry) => entry?.vendor === "copilot");
  const models = new Map<string, Model>();
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.id !== "string" ||
      !entry.id.trim()
    )
      continue;
    if (
      copilotModels &&
      (entry.vendor !== "copilot" || entry.id.startsWith("copilot-"))
    )
      continue;
    if (!models.has(entry.id)) {
      models.set(entry.id, {
        id: entry.id,
        name: typeof entry.name === "string" ? entry.name : entry.id,
      });
    }
  }
  return [...models.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchModels(
  provider: Provider,
  signal: AbortSignal,
): Promise<Model[]> {
  const response = await fetch(modelsUrl(provider.baseUrl), {
    headers: provider.apiKey
      ? { Authorization: `Bearer ${provider.apiKey}` }
      : {},
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });
  if (!response.ok)
    throw new Error(
      `Cannot load models (HTTP ${response.status}). Check Provider Settings.`,
    );
  const models = parseModels(await response.json());
  if (!models.length)
    throw new Error(
      "No models are available. Check your provider connection and sign-in.",
    );
  return models;
}
