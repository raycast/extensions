import type { Modality, PricingCatalog, PricingModel, Usage } from "./types";

export type ApiErrorKind = "bad-key" | "no-entitlement" | "offline" | "http";

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
  ) {
    super(message);
  }
}

async function getJson(url: string, auth?: string): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (auth) headers.Authorization = `Bearer ${auth}`;
  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch {
    throw new ApiError("offline", "Network request failed");
  }
  if (!res.ok) {
    if (res.status === 401)
      throw new ApiError("bad-key", "Go key invalid (401)");
    if (res.status === 403)
      throw new ApiError(
        "no-entitlement",
        "OpenCode Go subscription required (403)",
      );
    throw new ApiError("http", `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchUsage(key: string, baseUrl: string): Promise<Usage> {
  const json = (await getJson(`${baseUrl}/usage`, key)) as { usage?: Usage };
  if (!json.usage) throw new ApiError("http", "Unexpected usage response");
  return json.usage;
}

export async function fetchCatalog(baseUrl: string): Promise<string[]> {
  const json = (await getJson(`${baseUrl}/models`)) as { data?: unknown };
  if (!Array.isArray(json.data)) {
    throw new ApiError("http", "Unexpected catalog response");
  }
  const ids = json.data
    .map((m) => (m as { id?: unknown }).id)
    .filter(
      (id): id is string =>
        typeof id === "string" && id.length > 0 && id.length <= 128,
    );
  if (ids.length === 0) throw new ApiError("http", "Empty catalog response");
  return ids;
}

const MODALITY_KEYS = ["text", "image", "video", "audio"] as const;

function cleanModality(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (v): v is string =>
      typeof v === "string" && (MODALITY_KEYS as readonly string[]).includes(v),
  );
}

function readProvider(
  json: Record<string, { models?: Record<string, unknown> }>,
  provider: string,
): PricingModel[] {
  const models = json[provider]?.models;
  const out: PricingModel[] = [];
  for (const [id, raw] of Object.entries(models ?? {})) {
    const entry = raw as {
      cost?: { input?: unknown; output?: unknown; cache_read?: unknown };
      modalities?: { input?: unknown; output?: unknown };
    };
    if (!entry?.cost) continue;
    const toNum = (v: unknown): number =>
      typeof v === "number" && Number.isFinite(v) ? v : 0;
    const modalities: Modality | null = entry.modalities
      ? {
          input: cleanModality(entry.modalities.input),
          output: cleanModality(entry.modalities.output),
        }
      : null;
    out.push({
      id,
      cost: {
        input: toNum(entry.cost.input),
        output: toNum(entry.cost.output),
        cacheRead: toNum(entry.cost.cache_read),
      },
      modalities,
    });
  }
  return out;
}

export async function fetchPricing(
  modelsDevUrl: string,
): Promise<PricingCatalog> {
  const json = (await getJson(modelsDevUrl)) as Record<
    string,
    { models?: Record<string, unknown> }
  >;
  return {
    go: readProvider(json, "opencode-go"),
    zen: readProvider(json, "opencode"),
  };
}
