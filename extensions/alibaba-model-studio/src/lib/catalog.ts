import { AI, LocalStorage, getPreferenceValues } from "@raycast/api";

import { redactEndpoint } from "./format";
import { isDevelopment, log } from "./log";

// Alibaba Cloud Model Studio (DashScope) pay-as-you-go endpoints. Keys are
// region-bound: a China key only works against China endpoints, an
// International key only against International endpoints. Pay-as-you-go API
// keys only — Token Plan / Coding Plan keys (sk-sp-…) are not supported.
export const PAYG_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
export const PAYG_CN_BASE_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1";

const DEFAULT_PLATFORM: Platform = "payg";

export type Platform = "payg" | "payg-cn" | "custom";

export const PLATFORM_OPTIONS: Array<{ value: Platform; title: string }> = [
  { value: "payg", title: "Pay-As-You-Go (International)" },
  { value: "payg-cn", title: "Pay-As-You-Go (China)" },
  { value: "custom", title: "Custom Base URL" },
];

/** Display title for a raw platform preference value — raw values are never shown to users. */
export function platformTitle(value: string | undefined): string {
  const match = PLATFORM_OPTIONS.find((option) => option.value === value);
  if (match) return match.title;
  // Unknown/legacy values fall back to the default platform's title.
  return (
    PLATFORM_OPTIONS.find((option) => option.value === DEFAULT_PLATFORM)
      ?.title ?? PLATFORM_OPTIONS[0].title
  );
}

/** Team/business-space accounts scope requests with this header — pay-as-you-go endpoints only. */
export function acceptsWorkspaceHeader(platform: string | undefined): boolean {
  return platform === "payg" || platform === "payg-cn";
}

/** Workspace value for /models probes. Single source on purpose — the probe
 * cache key embeds this result, so every call site must derive it the same
 * way or in-flight dedupe stops matching. */
export function probeWorkspace(platform: string, workspaceId: string): string {
  return acceptsWorkspaceHeader(platform) ? workspaceId : "";
}

/** Web console for managing keys and subscriptions (linked from Check Setup). */
export function consoleURL(platform: string | undefined): string {
  return platform?.endsWith("-cn")
    ? "https://bailian.console.aliyun.com/"
    : "https://modelstudio.console.alibabacloud.com/";
}

/** Maps a platform preference value to its base URL; null when custom is selected without a URL. */
export function resolveBaseURL(
  platform: string | undefined,
  customBaseUrl: string | undefined,
): string | null {
  switch (platform) {
    case "payg-cn":
      return PAYG_CN_BASE_URL;
    case "custom": {
      const url = customBaseUrl?.trim() ?? "";
      if (!url) return null;
      // The custom URL carries the API key as a bearer credential — HTTPS
      // only, so an http:// or malformed value can't leak the key. Query
      // strings are rejected: both the /models probe and the AI SDK append
      // the request path by string concatenation, so a query would swallow
      // it and silently request the wrong endpoint.
      try {
        const parsed = new URL(url);
        // `parsed.search` is "" for an empty query ("…/v1?"), which toString()
        // still serializes — check the normalized string so a bare "?" is
        // rejected too. The hash is cleared first, so a fragment containing
        // "?" isn't wrongly rejected.
        parsed.hash = "";
        const normalized = parsed.toString();
        if (parsed.protocol !== "https:" || normalized.includes("?")) {
          return null;
        }
        return normalized.replace(/\/+$/, "");
      } catch {
        return null;
      }
    }
    case "payg":
    default:
      return PAYG_BASE_URL;
  }
}

export function getPreferences(): {
  apiKey: string;
  baseURL: string;
  platform: string;
  workspaceId: string;
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
    // Raw preference values — callers gate the workspace header on the
    // pay-as-you-go platforms and use the custom URL only for Custom.
    workspaceId: (prefs.workspaceId ?? "").trim(),
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

// Reasoning on these endpoints is a DashScope on/off switch (enable_thinking),
// so the effort picker only needs "thinking" vs "off" — GLM-style depth
// steering is not offered.
export const REASONING_EFFORTS = ["high", "none"] as const;

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

// models.dev provider slug per platform: DashScope's /models returns ids
// only, so titles, context windows and capabilities are enriched from the
// models.dev provider catalogs.
const MODELS_DEV_SLUG: Record<Exclude<Platform, "custom">, string> = {
  payg: "alibaba",
  "payg-cn": "alibaba-cn",
};

/** models.dev slug for a raw platform preference value. Unknown/legacy values
 * (e.g. a saved "token-plan" from an older build) fall back to the default
 * platform's slug, matching resolveBaseURL's default branch, so legacy
 * installs keep full metadata enrichment on the pay-as-you-go endpoint. */
function modelsDevSlug(platform: string): string | undefined {
  if (platform === "custom") return undefined;
  // Own-property lookup — plain indexing would surface inherited members for
  // preference values like "constructor".
  const nonCustom = platform as Exclude<Platform, "custom">;
  return Object.hasOwn(MODELS_DEV_SLUG, nonCustom)
    ? MODELS_DEV_SLUG[nonCustom]
    : MODELS_DEV_SLUG[DEFAULT_PLATFORM as Exclude<Platform, "custom">];
}

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
  const slug = modelsDevSlug(platform);
  if (!slug) return {};
  return loadMetadataForSlug(slug, options);
}

async function loadMetadataForSlug(
  slug: string,
  options?: { bypassCache?: boolean },
): Promise<Record<string, ModelMetadata>> {
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

/** Synchronous metadata lookup for the completion path — populated by getModels before any completion runs. */
export function cachedModelMetadata(
  platform: string,
  id: string,
): ModelMetadata | undefined {
  const slug = modelsDevSlug(platform);
  if (!slug) return undefined;
  const catalog = metadataMemoryCache[slug]?.metadata;
  if (!catalog) return undefined;
  if (Object.hasOwn(catalog, id)) return catalog[id];
  const alias = metadataAlias(id);
  return alias && Object.hasOwn(catalog, alias) ? catalog[alias] : undefined;
}

// Last resort when both the live /models endpoint and models.dev are
// unreachable (e.g. first run offline): a few flagship ids so the model list
// is never empty. Values mirror models.dev at the time of writing. Ids
// verified against models.dev's alibaba / alibaba-cn catalogs on 2026-10-05 —
// all are served in both regions; prune any that Model Studio retires.
const FALLBACK_CATALOG: Record<string, ModelMetadata> = {
  "qwen3.7-plus": {
    title: "Qwen3.7 Plus",
    description:
      "Multimodal Qwen workhorse for long-context agents, visual inputs and coding",
    contextWindow: 1_000_000,
    vision: true,
    tools: true,
    reasoning: true,
  },
  "qwen3.6-flash": {
    title: "Qwen3.6 Flash",
    description:
      "Fast Qwen vision-language model for visual reasoning, documents and agent tasks",
    contextWindow: 1_000_000,
    vision: true,
    tools: true,
    reasoning: true,
  },
  "qwen3-coder-plus": {
    title: "Qwen3 Coder Plus",
    description:
      "Qwen coder for software agents, repo edits and long-context code",
    contextWindow: 1_048_576,
    tools: true,
  },
  "qwen-plus": {
    title: "Qwen Plus",
    description:
      "Qwen instruction model for multilingual chat, reasoning and tool use",
    contextWindow: 1_000_000,
    tools: true,
    reasoning: true,
  },
  "qwen3-max": {
    title: "Qwen3 Max",
    description:
      "Flagship Qwen model for coding agents, complex reasoning and tool use",
    contextWindow: 262_144,
    tools: true,
  },
  "qwen-vl-max": {
    title: "Qwen VL Max",
    description:
      "Qwen vision-language model for visual reasoning and document understanding",
    contextWindow: 131_072,
    vision: true,
    tools: true,
  },
  "glm-5.2": {
    title: "GLM-5.2",
    description:
      "Open GLM flagship for long-horizon coding agents and million-token context",
    contextWindow: 1_000_000,
    tools: true,
    reasoning: true,
  },
  "kimi-k3": {
    title: "Kimi K3",
    description:
      "Multimodal Kimi model with 1M context and toggleable thinking",
    contextWindow: 1_048_576,
    vision: true,
    tools: true,
    reasoning: true,
  },
};

const FALLBACK_IDS = Object.keys(FALLBACK_CATALOG);

const VISION_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

// Plain asset string; the sibling `alibaba-cloud-logo@dark.png` is picked up
// automatically in dark appearance (Raycast's implicit theme-aware asset
// convention).
const MODEL_ICON: AI.RegisteredModel["icon"] = "alibaba-cloud-logo.png";

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
        : "Model from your Alibaba Cloud Model Studio account",
    contextWindow: meta?.contextWindow ?? DEFAULT_CONTEXT_WINDOW,
    capabilities: {
      systemMessage: { supported: true },
      temperature: { supported: true },
      streaming: { supported: true },
      tools: { supported: meta?.tools ?? true },
      // Unknown models get the benefit of the doubt (mirrors glm-models);
      // known models expose the effort picker only when they can think.
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

// DashScope /models can list non-chat services (embeddings, rerank, ASR/TTS,
// image/video generation). The keyword blocklist is unambiguous on its own;
// the vendor-prefix rule needs models.dev metadata to corroborate it, since a
// custom endpoint may serve other vendors' chat models.
const NON_CHAT_MODEL_ID =
  /(embed|rerank|asr|tts|voice|sambert|cosyvoice|paraformer|realtime|ocr|wanx|wan\d|kolors|flux|happyhorse|image|video|audio|deep-research|quark)/i;
const CHAT_VENDOR_PREFIX =
  /^(qwen|qwq|glm|kimi|minimax|deepseek|llama|moonshot|baichuan|yi)/i;

function isNonChatId(id: string): boolean {
  return NON_CHAT_MODEL_ID.test(id);
}

/**
 * Alternate catalog spelling for an id: DashScope uses both "vendor-version"
 * ("qwen3.8-max") and "vendor-version" dashed ("qwen-plus") styles, and an
 * account can list an id under the spelling models.dev doesn't use. Returns
 * the dash-stripped form when it differs, so lookups can try both. Lookup
 * alias only — the account's id is what gets registered and sent to the API.
 */
function metadataAlias(id: string): string | undefined {
  const stripped = id.replace(
    /^(qwen|qwq|glm|kimi|deepseek|minimax|moonshot)-(?=\d)/i,
    "$1",
  );
  return stripped === id ? undefined : stripped;
}

function isChatModelId(
  id: string,
  metadata: Record<string, ModelMetadata>,
): boolean {
  // Own-property lookup: `in` would also match inherited keys like
  // "constructor" or "toString".
  if (Object.hasOwn(metadata, id)) return true;
  const alias = metadataAlias(id);
  if (alias && Object.hasOwn(metadata, alias)) return true;
  return CHAT_VENDOR_PREFIX.test(id) && !isNonChatId(id);
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
  const alias = metadataAlias(id);
  if (alias) {
    if (Object.hasOwn(metadata, alias)) return metadata[alias];
    if (Object.hasOwn(FALLBACK_CATALOG, alias)) return FALLBACK_CATALOG[alias];
  }
  return undefined;
}

/**
 * Fallback heuristic for ids without models.dev metadata — shared with the
 * completion path in models.ts so the vendor lists can't drift apart: which
 * vendor prefixes are known to include thinking-capable models.
 */
export function isThinkingCapableModelId(id: string): boolean {
  return CHAT_VENDOR_PREFIX.test(id);
}

// Model Studio serves third-party vendors' models, and models.dev's alibaba
// catalogs trail the vendors' own — an id missing there can still have a full
// row (title, context window, vision…) in the vendor's catalog. Prefix → the
// vendor slug to consult for ids the platform catalog doesn't know; the
// platform slug always wins on conflict.
const VENDOR_METADATA_SLUGS: Array<[RegExp, string]> = [
  [/^glm/i, "zai"],
  [/^(kimi|moonshot)/i, "moonshotai"],
  [/^deepseek/i, "deepseek"],
  [/^minimax/i, "minimax"],
  // qwen/qwq ids missing from the China catalog — the International one is
  // the same vendor and usually more complete.
  [/^qw/i, "alibaba"],
];

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
// 60s, overlapping callers deduped onto one fetch. The caches are keyed by the
// credential pair (plus workspace), so a typed-different key in Check Setup
// always probes live and can never receive a background probe's result;
// failures are never cached. Explicit refreshes bypass every cache layer.
// Because Raycast may re-instantiate the extension between polls (dev
// reloads, per-surface scheduling) — resetting module state — the last
// successful probe is mirrored to LocalStorage, keyed by a fingerprint of
// that pair and never storing the API key itself.
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
  workspaceId?: string,
  options?: { bypassCache?: boolean },
): Promise<ModelsProbe> {
  if (!baseURL || !apiKey) {
    return {
      ok: false,
      reason: "missing-input",
      message: "Base URL or API key is missing.",
    };
  }
  const cacheKey = `${baseURL}|${apiKey}|${workspaceId ?? ""}`;
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
  const probe = probeModelsLive(baseURL, apiKey, workspaceId, cacheKey);
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
  workspaceId: string | undefined,
  cacheKey: string,
): Promise<ModelsProbe> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${baseURL}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(workspaceId ? { "X-DashScope-WorkSpace": workspaceId } : {}),
      },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        reason: "unauthorized",
        status: res.status,
        message: `Key rejected (HTTP ${res.status}). Alibaba Cloud keys are region-bound: China keys only work with China endpoints, International keys only with International endpoints. Pay-as-you-go API keys only — Token Plan and Coding Plan keys (sk-sp-…) are not supported. Check that Platform matches where your key was created.`,
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
  const { apiKey, baseURL, platform, workspaceId, extraModels } =
    getPreferences();
  const probeWorkspaceId = probeWorkspace(platform, workspaceId);
  // Independent lookups — run them concurrently so worst-case discovery
  // latency isn't the sum of both timeouts. Raycast's own polls call this
  // with no options (everything cached); explicit refreshes pass
  // bypassCache, which busts both the /models probe cache and the models.dev
  // metadata cache.
  const [metadata, probe] = await Promise.all([
    loadModelMetadata(platform, options),
    probeModelsEndpoint(baseURL, apiKey, probeWorkspaceId, options),
  ]);

  // The curated fallback is Alibaba-specific — a Custom endpoint may serve an
  // entirely different model family, so it never gets these ids (use the
  // Extra Models preference to force-include ids there).
  const allowCuratedFallback = platform !== "custom";

  let dynamicIds: string[];
  let discoveryChanged = false;
  if (probe.ok) {
    // Raycast polls discovery every few seconds — emit the breadcrumbs only
    // when the discovery actually changes, judged against a signature that
    // survives module re-instantiation so a reset instance doesn't re-log
    // the same line on every poll. The endpoint is part of the signature so
    // a platform switch that serves the same ids is still logged — in its
    // redacted form, so a credential-bearing custom URL is never persisted.
    // Dev diagnostics only: production builds skip the whole block, storage
    // I/O included.
    const signature = [redactEndpoint(baseURL), ...[...probe.ids].sort()].join(
      "\n",
    );
    if (isDevelopment && signature !== lastDiscoverySignature) {
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
        discoveryChanged = true;
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
    // models.dev mirrors each region's model list closely and is already
    // filtered to chat models; the curated catalog is the last resort.
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

  // The keyword blocklist applies to live ids unconditionally; the
  // vendor-prefix rule only when models.dev metadata corroborates ids —
  // without it, a custom endpoint serving gpt-* or claude-* ids would be
  // wiped.
  const filterNonChatIds = probe.ok;
  const filterChatIds = probe.ok && Object.keys(metadata).length > 0;

  const seen = new Set<string>();
  const ids: string[] = [];
  let filtered = 0;
  // Live order first; filter to chat models unless the ids already come from
  // a chat-only catalog.
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
  if (probe.ok && filtered > 0 && discoveryChanged) {
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
  // Enrich ids the platform catalog doesn't know from the vendor's own
  // models.dev catalog — the alibaba catalogs trail the vendors', so a fresh
  // GLM/Kimi/DeepSeek/MiniMax model would otherwise show its raw id with
  // default capabilities. Platform-slug metadata always wins on conflict;
  // the vendor lookups share the same 24h cache and in-flight dedupe.
  const missingVendorSlugs = new Set<string>();
  for (const id of ids) {
    const alias = metadataAlias(id);
    if (
      Object.hasOwn(metadata, id) ||
      (alias && Object.hasOwn(metadata, alias))
    )
      continue;
    for (const [prefix, slug] of VENDOR_METADATA_SLUGS) {
      if (prefix.test(id)) {
        missingVendorSlugs.add(slug);
        break;
      }
    }
  }
  let enrichedMetadata = metadata;
  if (missingVendorSlugs.size > 0) {
    // The qwen vendor rule maps to the platform's own slug, which
    // loadModelMetadata just fetched with the same options — re-bypassing it
    // would re-download the identical models.dev document, so that slug goes
    // through the fresh cache (or failure backoff) instead.
    const platformSlug = modelsDevSlug(platform);
    const vendorCatalogs = await Promise.all(
      [...missingVendorSlugs].map((slug) =>
        loadMetadataForSlug(slug, slug === platformSlug ? undefined : options),
      ),
    );
    enrichedMetadata = { ...Object.assign({}, ...vendorCatalogs), ...metadata };
  }
  return ids.map((id) =>
    toRegisteredModel(id, metadataFor(id, enrichedMetadata)),
  );
};
