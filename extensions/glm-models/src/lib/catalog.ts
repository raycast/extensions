import { AI, LocalStorage, getPreferenceValues } from "@raycast/api";

import { redactEndpoint } from "./format";
import { log } from "./log";

export const ZAI_BASE_URL = "https://api.z.ai/api/paas/v4";
export const BIGMODEL_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

export type Platform = "zai" | "bigmodel" | "custom";

const DEFAULT_PLATFORM: Platform = "zai";

export const PLATFORM_OPTIONS: Array<{ value: Platform; title: string }> = [
  { value: "zai", title: "Z.ai (pay-as-you-go)" },
  { value: "bigmodel", title: "BigModel (pay-as-you-go)" },
  { value: "custom", title: "Custom base URL" },
];

/** Display title for a raw platform preference value — raw values are never shown to users. */
export function platformTitle(value: string | undefined): string {
  return (
    PLATFORM_OPTIONS.find((option) => option.value === value)?.title ??
    "Z.ai (pay-as-you-go)"
  );
}

/** Web console for managing keys and subscriptions (linked from Check Setup). */
export function consoleURL(platform: string | undefined): string {
  return platform?.startsWith("bigmodel")
    ? "https://open.bigmodel.cn/usercenter/apikeys"
    : "https://z.ai/manage-apikey/api-key-list";
}

export const REASONING_EFFORTS = [
  "max",
  "xhigh",
  "high",
  "medium",
  "low",
  "minimal",
  "none",
] as const;

/** Maps a platform preference value to its base URL; null when custom is selected without a URL. */
export function resolveBaseURL(
  platform: string | undefined,
  customBaseUrl: string | undefined,
): string | null {
  switch (platform) {
    case "bigmodel":
      return BIGMODEL_BASE_URL;
    case "custom": {
      const url = customBaseUrl?.trim() ?? "";
      if (!url) return null;
      // The custom URL carries the API key as a bearer credential — HTTPS
      // only, so an http:// or malformed value can't leak the key.
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:"
          ? parsed.toString().replace(/\/+$/, "")
          : null;
      } catch {
        return null;
      }
    }
    case "zai":
    default:
      return ZAI_BASE_URL;
  }
}

export function getPreferences(): {
  apiKey: string;
  baseURL: string;
  platform: string;
  customBaseUrl: string;
  extraModels: string;
} {
  const prefs = getPreferenceValues<Preferences>();
  const platform = prefs.platform ?? DEFAULT_PLATFORM;
  return {
    // getPreferenceValues only guarantees values that are set — the AI
    // provider entrypoints run without the launcher's required-field gate,
    // so a missing key must degrade gracefully instead of throwing.
    apiKey: (prefs.apiKey ?? "").trim(),
    baseURL: resolveBaseURL(platform, prefs.customBaseUrl) ?? "",
    platform,
    // Raw preference value, used only when Platform is Custom.
    customBaseUrl: (prefs.customBaseUrl ?? "").trim(),
    extraModels: prefs.extraModels ?? "",
  };
}

export type ModelMetadata = {
  title: string;
  description: string;
  contextWindow: number;
  vision?: boolean;
  tools?: boolean;
  reasoning?: boolean;
};

// models.dev provider slug per platform: Z.ai's /models returns ids only, so
// titles, context windows and capabilities are enriched from the models.dev
// provider catalogs. Both platforms serve the same model ids and models.dev
// has no BigModel slug, so BigModel reuses the Z.ai catalogs.
const MODELS_DEV_SLUG: Record<Exclude<Platform, "custom">, string> = {
  zai: "zai",
  bigmodel: "zai",
};

const MODELS_DEV_API_URL = "https://models.dev/api.json";
const MODELS_DEV_FETCH_TIMEOUT_MS = 10_000;
const METADATA_CACHE_PREFIX = "models-dev-metadata:";
const METADATA_TTL_MS = 24 * 60 * 60 * 1000;
// While models.dev is unreachable, wait this long between retries so
// discovery isn't stalled by the fetch timeout on every call.
const METADATA_RETRY_BACKOFF_MS = 10 * 60 * 1000;
const DEFAULT_CONTEXT_WINDOW = 128_000;

type CachedMetadata = {
  fetchedAt: number;
  metadata: Record<string, ModelMetadata>;
};

// models.dev model entry — the subset of fields we consume.
type ModelsDevModel = {
  name?: string;
  description?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  status?: string;
  modalities?: { input?: string[]; output?: string[] };
  limit?: { context?: number };
};

const metadataMemoryCache: Record<string, CachedMetadata> = {};
const metadataFailedAt: Record<string, number> = {};
// Dedupes overlapping discovery passes (background refresh + Refresh Models
// command) onto a single models.dev fetch.
const metadataInFlight: Partial<
  Record<string, Promise<Record<string, ModelMetadata>>>
> = {};

function toMetadata(id: string, model: ModelsDevModel): ModelMetadata | null {
  // Exclude only entries that explicitly declare non-text outputs — image and
  // video services cannot back a Raycast AI chat model, but models.dev leaves
  // `modalities` off some chat models and dropping those would lose their
  // titles/context windows.
  const outputs = model.modalities?.output;
  if (outputs && outputs.length > 0 && !outputs.includes("text")) return null;
  const inputs = model.modalities?.input ?? [];
  const context = model.limit?.context;
  return {
    title: model.name?.trim() || id,
    description: model.description?.trim() || "",
    contextWindow: context && context > 0 ? context : DEFAULT_CONTEXT_WINDOW,
    // `attachment` covers documents too, so it only counts as vision when the
    // input modalities are undeclared; `modalities.input` is authoritative.
    vision:
      inputs.includes("image") ||
      (inputs.length === 0 && model.attachment === true),
    tools: model.tool_call !== false,
    reasoning: model.reasoning === true,
  };
}

async function readCachedMetadata(
  slug: string,
): Promise<CachedMetadata | undefined> {
  try {
    const raw = await LocalStorage.getItem<string>(
      METADATA_CACHE_PREFIX + slug,
    );
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<CachedMetadata> | null;
    // A corrupted or future-shaped entry must not take discovery down for a
    // whole TTL window — treat it as a cache miss.
    if (
      !parsed ||
      typeof parsed.fetchedAt !== "number" ||
      !parsed.metadata ||
      typeof parsed.metadata !== "object"
    ) {
      return undefined;
    }
    return parsed as CachedMetadata;
  } catch {
    return undefined;
  }
}

/**
 * Fetches (and caches for 24h in LocalStorage) the models.dev catalog for the
 * platform's provider slug. Falls back to a stale cache when models.dev is
 * unreachable, and to {} when there is nothing to fall back to (Custom
 * platform, first run offline). Overlapping callers share one fetch.
 */
export async function loadModelMetadata(
  platform: string,
  options?: { bypassCache?: boolean },
): Promise<Record<string, ModelMetadata>> {
  // Own-property lookup — plain indexing would surface inherited members for
  // preference values like "constructor".
  const slug = Object.hasOwn(MODELS_DEV_SLUG, platform)
    ? MODELS_DEV_SLUG[platform as Exclude<Platform, "custom">]
    : undefined;
  if (!slug) return {};
  // An explicit refresh skips every cache gate — memory, LocalStorage TTL and
  // the failure backoff — so a just-released model gets real metadata right
  // away. It still joins an in-flight fetch instead of starting a duplicate.
  if (!options?.bypassCache) {
    const memory = metadataMemoryCache[slug];
    if (memory && Date.now() - memory.fetchedAt < METADATA_TTL_MS) {
      return memory.metadata;
    }
    if (
      Date.now() - (metadataFailedAt[slug] ?? 0) <
      METADATA_RETRY_BACKOFF_MS
    ) {
      // models.dev was recently unreachable — back off rather than eat the
      // fetch timeout on every discovery pass, serving what we last saw.
      return memory?.metadata ?? {};
    }

    const cached = await readCachedMetadata(slug);
    if (cached && Date.now() - cached.fetchedAt < METADATA_TTL_MS) {
      metadataMemoryCache[slug] = cached;
      return cached.metadata;
    }
  }
  // Both paths converge here: a bypassed refresh always fetches (or joins
  // whatever fetch is already running), an ordinary lookup only after every
  // cache gate missed. fetchMetadataForSlug itself falls back to the stale
  // cache when models.dev is unreachable.
  return await (metadataInFlight[slug] ??= fetchMetadataForSlug(slug));
}

async function fetchMetadataForSlug(
  slug: string,
): Promise<Record<string, ModelMetadata>> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    MODELS_DEV_FETCH_TIMEOUT_MS,
  );
  try {
    const res = await fetch(MODELS_DEV_API_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as Record<
      string,
      { models?: Record<string, ModelsDevModel> }
    >;
    const metadata: Record<string, ModelMetadata> = {};
    for (const [id, model] of Object.entries(json[slug]?.models ?? {})) {
      // A null/invalid row must not throw away every valid model in the
      // same fetch.
      if (!model) continue;
      if (model.status === "deprecated") continue;
      const meta = toMetadata(id, model);
      if (meta) metadata[id] = meta;
    }
    // A 2xx with no usable models for the slug (renamed upstream, schema
    // change) must not be cached as fresh — treat it like a failed lookup so
    // the backoff and stale cache apply.
    if (Object.keys(metadata).length === 0) {
      throw new Error(`models.dev has no chat models for "${slug}"`);
    }
    const fresh: CachedMetadata = { fetchedAt: Date.now(), metadata };
    metadataMemoryCache[slug] = fresh;
    delete metadataFailedAt[slug];
    try {
      await LocalStorage.setItem(
        METADATA_CACHE_PREFIX + slug,
        JSON.stringify(fresh),
      );
    } catch {
      // Cache write failure is non-fatal — metadata still works for this session.
    }
    return metadata;
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    const cached = await readCachedMetadata(slug);
    log(
      `models.dev lookup failed (${aborted ? "timed out" : error instanceof Error ? error.message : String(error)})${cached ? " — using stale cached metadata" : ""}`,
    );
    metadataFailedAt[slug] = Date.now();
    if (cached) {
      metadataMemoryCache[slug] = cached;
      return cached.metadata;
    }
    return {};
  } finally {
    clearTimeout(timer);
    delete metadataInFlight[slug];
  }
}

// Last resort when both the live /models endpoint and models.dev are
// unreachable (e.g. first run offline): a few flagship ids so the model list
// is never empty. Context windows mirror models.dev at the time of writing.
// Ids last verified against the live /models endpoint on 2026-09-27 — prune
// any that Z.ai/BigModel retire.
const FALLBACK_CATALOG: Record<string, ModelMetadata> = {
  "glm-5.3": {
    title: "GLM-5.3",
    description: "Flagship model for reasoning, coding and agents",
    contextWindow: 1_000_000,
    tools: true,
    reasoning: true,
  },
  "glm-5.2": {
    title: "GLM-5.2",
    description: "Previous flagship, strong reasoning and coding",
    contextWindow: 1_000_000,
    tools: true,
    reasoning: true,
  },
  "glm-5.3-flash": {
    title: "GLM-5.3 Flash",
    description: "Fast multimodal model with vision",
    contextWindow: 1_000_000,
    vision: true,
    tools: true,
    reasoning: true,
  },
  "glm-4.7": {
    title: "GLM-4.7",
    description: "Dependable model for coding and agent tasks",
    contextWindow: 204_800,
    tools: true,
    reasoning: true,
  },
  "glm-4.6": {
    title: "GLM-4.6",
    description: "Coding-focused reasoning model",
    contextWindow: 204_800,
    tools: true,
    reasoning: true,
  },
  "glm-4.5-flash": {
    title: "GLM-4.5 Flash (free)",
    description: "Free tier model for quick tasks",
    contextWindow: 131_072,
    tools: true,
    reasoning: true,
  },
};

const FALLBACK_IDS = Object.keys(FALLBACK_CATALOG);

const VISION_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

function isGlm5(id: string): boolean {
  return /^glm-5/i.test(id);
}

// Plain asset string; the sibling `z-ai-logo@dark.png` is picked up automatically
// in dark appearance (Raycast's implicit theme-aware asset convention).
const MODEL_ICON: AI.RegisteredModel["icon"] = "z-ai-logo.png";

export function toRegisteredModel(
  id: string,
  meta?: ModelMetadata,
): AI.RegisteredModel {
  const model: AI.RegisteredModel = {
    id,
    title: meta?.title ?? id,
    icon: MODEL_ICON,
    description:
      meta?.description && meta.description.length > 0
        ? meta.description
        : "GLM model from your Z.ai / BigModel account",
    contextWindow: meta?.contextWindow ?? DEFAULT_CONTEXT_WINDOW,
    capabilities: {
      systemMessage: { supported: true },
      temperature: { supported: true },
      streaming: { supported: true },
      tools: { supported: meta?.tools ?? true },
      // Unknown models get the benefit of the doubt; known non-thinking
      // models hide the effort picker.
      reasoningEffort:
        meta === undefined || meta.reasoning
          ? {
              supported: true,
              options: [...REASONING_EFFORTS],
              default: "high",
            }
          : undefined,
      ...(meta?.vision
        ? { vision: { mediaTypes: [...VISION_MEDIA_TYPES] } }
        : {}),
    },
  };
  return model;
}

/**
 * GLM-5.x keeps thinking enabled and steers depth with `reasoning_effort`;
 * GLM-4.x only toggles `thinking.type`. See buildProviderOptions in models.ts.
 */
export { isGlm5 };

// /models can list non-chat services (embeddings, rerank, ASR/TTS…). The
// keyword blocklist is unambiguous on its own; the `^glm` prefix rule needs
// models.dev metadata to corroborate it, since a custom endpoint may serve
// other vendors' chat models.
const NON_CHAT_MODEL_ID =
  /(embedding|rerank|asr|tts|voice|video|image|ocr|realtime)/i;

function isNonChatId(id: string): boolean {
  return NON_CHAT_MODEL_ID.test(id);
}

function isChatModelId(
  id: string,
  metadata: Record<string, ModelMetadata>,
): boolean {
  // Own-property lookup: `in` would also match inherited keys like
  // "constructor" or "toString".
  if (Object.hasOwn(metadata, id)) return true;
  return /^glm/i.test(id);
}

/** Metadata precedence: models.dev first, curated catalog second, defaults last. */
function metadataFor(
  id: string,
  metadata: Record<string, ModelMetadata>,
): ModelMetadata | undefined {
  // Own-property lookups — plain indexing would surface inherited members
  // (Object.prototype.toString and friends) for ids like "toString".
  if (Object.hasOwn(metadata, id)) return metadata[id];
  if (Object.hasOwn(FALLBACK_CATALOG, id)) return FALLBACK_CATALOG[id];
  return undefined;
}

export type ModelsProbe =
  | { ok: true; ids: string[] }
  | {
      ok: false;
      reason:
        "missing-input" | "unauthorized" | "not-found" | "network" | "empty";
      status?: number;
      message: string;
    };

// Raycast polls getModels every few seconds (AI surfaces refresh on their own
// schedule), so a successful /models probe is cached briefly: successes for
// 60s, overlapping callers deduped onto one fetch. The caches are keyed by a
// fingerprint of the credential pair, so a typed-different key in Check Setup
// always probes live and can never receive a background probe's result;
// failures are never cached. Explicit refreshes bypass every cache layer.
// Because Raycast may re-instantiate the extension between polls (dev
// reloads, per-surface scheduling) — resetting module state — the last
// successful probe is mirrored to LocalStorage, keyed by that fingerprint
// and never storing the API key itself.
const MODELS_PROBE_CACHE_TTL_MS = 60_000;
const PROBE_LS_KEY = "models-probe-cache";
let modelsProbeCache:
  { key: string; fetchedAt: number; probe: ModelsProbe } | undefined;
const modelsProbeInFlight: Record<string, Promise<ModelsProbe>> = {};

function credentialFingerprint(value: string): string {
  // djb2 — enough to tell key/base-URL combinations apart without ever
  // persisting the key material itself.
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

async function readPersistedProbe(
  fingerprint: string,
): Promise<{ fetchedAt: number; probe: ModelsProbe } | undefined> {
  try {
    const raw = await LocalStorage.getItem<string>(PROBE_LS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as {
      fingerprint?: unknown;
      fetchedAt?: unknown;
      ids?: unknown;
    } | null;
    if (
      !parsed ||
      parsed.fingerprint !== fingerprint ||
      typeof parsed.fetchedAt !== "number" ||
      !Array.isArray(parsed.ids) ||
      Date.now() - parsed.fetchedAt >= MODELS_PROBE_CACHE_TTL_MS
    ) {
      return undefined;
    }
    const ids = parsed.ids.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
    if (ids.length === 0) return undefined;
    return { fetchedAt: parsed.fetchedAt, probe: { ok: true, ids } };
  } catch {
    return undefined;
  }
}

async function persistProbe(
  fingerprint: string,
  probe: Extract<ModelsProbe, { ok: true }>,
): Promise<void> {
  try {
    await LocalStorage.setItem(
      PROBE_LS_KEY,
      JSON.stringify({
        fingerprint,
        fetchedAt: Date.now(),
        ids: probe.ids,
      }),
    );
  } catch {
    // Best-effort — the in-memory cache still covers the current session.
  }
}

/** Probes GET {base}/models and classifies the outcome so failures can be explained to the user. */
export async function probeModelsEndpoint(
  baseURL: string,
  apiKey: string,
  options?: { bypassCache?: boolean },
): Promise<ModelsProbe> {
  if (!baseURL || !apiKey) {
    return {
      ok: false,
      reason: "missing-input",
      message: "Base URL or API key is missing.",
    };
  }
  const cacheKey = `${baseURL}|${apiKey}`;
  const fingerprint = credentialFingerprint(cacheKey);
  if (
    !options?.bypassCache &&
    modelsProbeCache &&
    modelsProbeCache.key === cacheKey &&
    Date.now() - modelsProbeCache.fetchedAt < MODELS_PROBE_CACHE_TTL_MS
  ) {
    return modelsProbeCache.probe;
  }
  if (!options?.bypassCache) {
    const persisted = await readPersistedProbe(fingerprint);
    if (persisted) {
      // A concurrent bypass refresh may have landed a fresher result while
      // this LocalStorage read was in flight — rehydrate only when the
      // persisted entry is the newer one, so a refresh's result is never
      // clobbered by an older snapshot.
      if (
        !modelsProbeCache ||
        modelsProbeCache.key !== cacheKey ||
        persisted.fetchedAt > modelsProbeCache.fetchedAt
      ) {
        modelsProbeCache = {
          key: cacheKey,
          fetchedAt: persisted.fetchedAt,
          probe: persisted.probe,
        };
      }
      const cached = modelsProbeCache;
      if (cached && cached.key === cacheKey) return cached.probe;
    }
  }
  const inFlight = modelsProbeInFlight[cacheKey];
  if (inFlight) return inFlight;
  const probe = probeModelsLive(baseURL, apiKey, cacheKey);
  modelsProbeInFlight[cacheKey] = probe;
  try {
    const result = await probe;
    if (result.ok) await persistProbe(fingerprint, result);
    return result;
  } finally {
    delete modelsProbeInFlight[cacheKey];
  }
}

async function probeModelsLive(
  baseURL: string,
  apiKey: string,
  cacheKey: string,
): Promise<ModelsProbe> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${baseURL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        reason: "unauthorized",
        status: res.status,
        message: `Key rejected (HTTP ${res.status}). Your API key doesn't match this platform, or it is invalid or expired. Z.ai and BigModel keys are not interchangeable. Pay-as-you-go keys only — GLM Coding Plan and Team Plan keys are not supported.`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        reason: res.status === 404 ? "not-found" : "network",
        status: res.status,
        // Custom base URLs can be credential-bearing — display-bound messages
        // only ever carry the redacted form.
        message: `HTTP ${res.status} from ${redactEndpoint(baseURL)}/models.`,
      };
    }
    const json: unknown = await res.json();
    let list: unknown[];
    if (Array.isArray(json)) {
      list = json;
    } else {
      const wrapped = json as { data?: unknown[] };
      list = Array.isArray(wrapped.data) ? wrapped.data : [];
    }
    const ids = list
      .map((entry) =>
        typeof entry === "string" ? entry : (entry as { id?: unknown })?.id,
      )
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    if (ids.length === 0) {
      return {
        ok: false,
        reason: "empty",
        message: `${redactEndpoint(baseURL)}/models responded but contained no model IDs.`,
      };
    }
    const probe: ModelsProbe = { ok: true, ids };
    modelsProbeCache = { key: cacheKey, fetchedAt: Date.now(), probe };
    return probe;
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      reason: "network",
      message: aborted
        ? `Timed out connecting to ${redactEndpoint(baseURL)}.`
        : `Could not reach ${redactEndpoint(baseURL)} (${error instanceof Error ? error.message : String(error)}).`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function parseExtraModels(extra: string | undefined): string[] {
  return (extra ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

// Signature of the last logged discovery — change-only logging keeps the dev
// console readable while Raycast polls. Because module state may not survive
// between polls, the signature is also mirrored to LocalStorage and checked
// against it before logging (see probeModelsEndpoint).
const DISCOVERY_SIGNATURE_LS_KEY = "models-discovery-signature";
let lastDiscoverySignature: string | undefined;

export const getModels = async (options?: {
  bypassCache?: boolean;
}): Promise<AI.RegisteredModel[]> => {
  const { apiKey, baseURL, platform, extraModels } = getPreferences();
  // Independent lookups — run them concurrently so worst-case discovery
  // latency isn't the sum of both timeouts. Raycast's own polls call this
  // with no options (everything cached); explicit refreshes pass
  // bypassCache, which busts both the /models probe cache and the models.dev
  // metadata cache.
  const [metadata, probe] = await Promise.all([
    loadModelMetadata(platform, options),
    probeModelsEndpoint(baseURL, apiKey, options),
  ]);

  // The curated fallback is GLM/Z.ai-specific — a Custom endpoint may serve an
  // entirely different model family, so it never gets these ids (use the
  // Extra Models preference to force-include ids there).
  const allowCuratedFallback = platform !== "custom";

  let dynamicIds: string[];
  if (probe.ok) {
    // Raycast polls discovery every few seconds — emit the breadcrumb only
    // when the discovery actually changes, judged against a signature that
    // survives module re-instantiation so a reset instance doesn't re-log
    // the same line on every poll. The endpoint is part of the signature so
    // a platform switch that serves the same ids is still logged — in its
    // redacted form, so a credential-bearing custom URL is never persisted.
    const signature = [redactEndpoint(baseURL), ...[...probe.ids].sort()].join(
      "\n",
    );
    if (signature !== lastDiscoverySignature) {
      lastDiscoverySignature = signature;
      let persistedSignature: string | undefined;
      try {
        persistedSignature =
          (await LocalStorage.getItem<string>(DISCOVERY_SIGNATURE_LS_KEY)) ??
          undefined;
      } catch {
        // Dev-diagnostic nicety only — a failed read can log one extra line.
      }
      if (signature !== persistedSignature) {
        log(
          `discovered ${probe.ids.length} model ids via ${redactEndpoint(baseURL)}/models`,
        );
        try {
          await LocalStorage.setItem(DISCOVERY_SIGNATURE_LS_KEY, signature);
        } catch {
          // As above — non-fatal.
        }
      }
    }
    dynamicIds = probe.ids;
  } else {
    log(
      `/models lookup failed on ${redactEndpoint(baseURL)}: ${probe.message}`,
    );
    // models.dev mirrors the platform model lists and is already filtered to
    // chat models; the curated catalog is the last resort.
    const catalogIds = Object.keys(metadata);
    dynamicIds =
      catalogIds.length > 0
        ? catalogIds
        : allowCuratedFallback
          ? FALLBACK_IDS
          : [];
    if (dynamicIds.length > 0) {
      log(
        `using the ${catalogIds.length > 0 ? "models.dev" : "curated fallback"} model list (${dynamicIds.length} ids)`,
      );
    } else {
      log(
        "no model fallback for a Custom endpoint — set the Extra Models preference to force-include model ids",
      );
    }
  }

  // The keyword blocklist applies to live ids unconditionally; the `^glm`
  // prefix rule only when models.dev metadata corroborates ids — without it,
  // a custom endpoint serving gpt-* or claude-* ids would be wiped.
  const filterChatIds = probe.ok && Object.keys(metadata).length > 0;
  const filterNonChatIds = probe.ok;

  const seen = new Set<string>();
  const ids: string[] = [];
  let filtered = 0;
  for (const id of dynamicIds) {
    if (seen.has(id)) continue;
    if (
      (filterNonChatIds && isNonChatId(id)) ||
      (filterChatIds && !isChatModelId(id, metadata))
    ) {
      filtered++;
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  if (probe.ok && filtered > 0) {
    log(`${ids.length} chat models kept, ${filtered} non-chat ids filtered`);
  }
  if (ids.length === 0) {
    if (!allowCuratedFallback) {
      log("no usable models for a Custom endpoint — returning an empty list");
    } else {
      // An account where every discovered id was filtered out shouldn't leave
      // the picker empty.
      log(
        "every discovered id was filtered out — using the curated fallback model list",
      );
      for (const id of FALLBACK_IDS) {
        if (seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
      }
    }
  }
  // Anything the user explicitly asked for.
  for (const id of parseExtraModels(extraModels)) {
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids.map((id) => toRegisteredModel(id, metadataFor(id, metadata)));
};
