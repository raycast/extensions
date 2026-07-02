import { ApiCompatible, buildCompatibleUrl, getCompatibilityProfile } from "./api-compatibility";

export interface ModelOption {
  id: string;
  name: string;
}

export interface ModelListSettings {
  apiBase: string;
  apiCompatible: ApiCompatible;
  apiKey?: string;
}

export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export function buildModelsUrl(settings: ModelListSettings): string {
  const profile = getCompatibilityProfile(settings.apiCompatible);
  return buildCompatibleUrl(settings.apiBase, profile.modelsPath);
}

export function buildModelListUrlCandidates(settings: ModelListSettings): string[] {
  const primary = buildModelsUrl(settings);
  const candidates = [primary];

  try {
    const url = new URL(normalizeModelListBase(settings.apiBase));
    const segments = url.pathname.split("/").filter(Boolean);
    if (/^v\d+$/i.test(segments[segments.length - 1] ?? "")) {
      url.pathname = `/${segments.slice(0, -1).join("/")}/models`.replace("//", "/");
      const fallback = url.toString();
      if (!candidates.includes(fallback)) {
        candidates.push(fallback);
      }
    }
  } catch {
    // Keep the primary URL for non-standard but fetchable bases.
  }

  return candidates;
}

function normalizeModelListBase(apiBase: string): string {
  return apiBase.trim().replace(/\/+$/, "");
}

export function requestHeaders(settings: ModelListSettings): Record<string, string> {
  if (settings.apiCompatible === "raycast") {
    return {};
  }

  if (settings.apiCompatible === "anthropic") {
    return {
      "anthropic-version": "2023-06-01",
      ...(settings.apiKey ? { "x-api-key": settings.apiKey } : {}),
    };
  }

  return settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {};
}

export function parseModelList(payload: unknown, apiCompatible: ApiCompatible): ModelOption[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const entries =
    "data" in payload && Array.isArray(payload.data)
      ? payload.data
      : "models" in payload && Array.isArray(payload.models)
        ? payload.models
        : [];

  return entries
    .map((item) => {
      if (typeof item === "string") {
        return { id: item, name: item };
      }
      if (!item || typeof item !== "object" || !("id" in item) || typeof item.id !== "string") {
        return undefined;
      }
      const name =
        apiCompatible === "anthropic" && "display_name" in item && typeof item.display_name === "string"
          ? item.display_name
          : item.id;
      return { id: item.id, name };
    })
    .filter((item): item is ModelOption => Boolean(item));
}

function formatRaycastAIModelName(key: string): string {
  return key.replaceAll("_", " ");
}

export function parseRaycastAIModelEnum(modelEnum: Record<string, string>): ModelOption[] {
  const seen = new Set<string>();
  return Object.entries(modelEnum)
    .filter(([, id]) => {
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    })
    .map(([key, id]) => ({
      id,
      name: formatRaycastAIModelName(key),
    }));
}

export async function listModels(
  settings: ModelListSettings,
  fetcher: FetchLike = fetch,
  raycastModelEnum: Record<string, string> = {},
): Promise<ModelOption[]> {
  if (settings.apiCompatible === "raycast") {
    return parseRaycastAIModelEnum(raycastModelEnum);
  }

  let lastStatus: number | undefined;
  for (const url of buildModelListUrlCandidates(settings)) {
    const response = await fetcher(url, {
      headers: requestHeaders(settings),
    });
    lastStatus = response.status;
    if (!response.ok) {
      continue;
    }
    const models = parseModelList(await response.json(), settings.apiCompatible);
    if (models.length > 0 || url === buildModelListUrlCandidates(settings).at(-1)) {
      return models;
    }
  }
  throw new Error(`Model list request failed: ${lastStatus ?? "unknown"}`);
}
