import { LocalStorage } from "@raycast/api";
import { ApiProfile, ProfileStoreData } from "../types/profile";

const PROFILE_STORE_KEY = "translator.profile-store.v1";
const MIN_TIMEOUT_MS = 1000;

export interface ProfileDraft {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: string;
  enableStreaming: boolean;
  customHeadersJson: string;
  enabled: boolean;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function parseTimeoutMs(rawTimeout: string): number {
  const parsedTimeout = Number(rawTimeout);
  if (!Number.isFinite(parsedTimeout) || parsedTimeout < MIN_TIMEOUT_MS) {
    throw new Error(`Timeout must be a number >= ${MIN_TIMEOUT_MS} ms.`);
  }

  return Math.floor(parsedTimeout);
}

function normalizeCustomHeaders(rawHeaders: string): string {
  const trimmedHeaders = rawHeaders.trim();
  if (!trimmedHeaders) {
    return "";
  }

  let parsedHeaders: unknown;
  try {
    parsedHeaders = JSON.parse(trimmedHeaders);
  } catch {
    throw new Error("Custom headers must be valid JSON.");
  }

  if (
    !parsedHeaders ||
    Array.isArray(parsedHeaders) ||
    typeof parsedHeaders !== "object"
  ) {
    throw new Error("Custom headers JSON must be an object.");
  }

  return JSON.stringify(parsedHeaders);
}

function validateProfileName(name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Profile name is required.");
  }

  return trimmedName;
}

function validateApiKey(apiKey: string): string {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    throw new Error("API key is required.");
  }

  return trimmedApiKey;
}

function validateModel(model: string): string {
  const trimmedModel = model.trim();
  if (!trimmedModel) {
    throw new Error("Model is required.");
  }

  return trimmedModel;
}

function validateBaseUrl(baseUrl: string): string {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    throw new Error("API base URL is required.");
  }

  return normalizedBaseUrl;
}

function ensureStoreShape(store: ProfileStoreData): ProfileStoreData {
  const profileIds = new Set(store.profiles.map((profile) => profile.id));
  const hasDefault = store.defaultProfileId
    ? profileIds.has(store.defaultProfileId)
    : false;
  const defaultProfileId = hasDefault
    ? store.defaultProfileId
    : (store.profiles[0]?.id ?? null);
  return { profiles: store.profiles, defaultProfileId };
}

function parseStoredProfile(profile: unknown): ApiProfile | null {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const candidate = profile as Partial<ApiProfile>;
  if (
    !candidate.id ||
    !candidate.name ||
    !candidate.baseUrl ||
    !candidate.apiKey ||
    !candidate.model
  ) {
    return null;
  }

  const timeoutMs = Number(candidate.timeoutMs);
  if (!Number.isFinite(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS) {
    return null;
  }

  return {
    id: String(candidate.id),
    name: String(candidate.name),
    baseUrl: normalizeBaseUrl(String(candidate.baseUrl)),
    apiKey: String(candidate.apiKey),
    model: String(candidate.model),
    timeoutMs: Math.floor(timeoutMs),
    enableStreaming: Boolean(candidate.enableStreaming),
    customHeadersJson: String(candidate.customHeadersJson ?? ""),
    enabled: candidate.enabled !== false,
  };
}

function parseStore(rawStore: string | undefined): ProfileStoreData {
  if (!rawStore) {
    return { profiles: [], defaultProfileId: null };
  }

  let parsedStore: unknown;
  try {
    parsedStore = JSON.parse(rawStore);
  } catch {
    return { profiles: [], defaultProfileId: null };
  }

  if (!parsedStore || typeof parsedStore !== "object") {
    return { profiles: [], defaultProfileId: null };
  }

  const data = parsedStore as Partial<ProfileStoreData>;
  const profiles = Array.isArray(data.profiles)
    ? (data.profiles.map(parseStoredProfile).filter(Boolean) as ApiProfile[])
    : [];
  const defaultProfileId =
    typeof data.defaultProfileId === "string" ? data.defaultProfileId : null;
  return ensureStoreShape({ profiles, defaultProfileId });
}

export async function readProfileStore(): Promise<ProfileStoreData> {
  const rawStore = await LocalStorage.getItem<string>(PROFILE_STORE_KEY);
  return parseStore(rawStore ?? undefined);
}

export async function writeProfileStore(
  store: ProfileStoreData,
): Promise<void> {
  const normalizedStore = ensureStoreShape(store);
  await LocalStorage.setItem(
    PROFILE_STORE_KEY,
    JSON.stringify(normalizedStore),
  );
}

export function buildProfileFromDraft(
  draft: ProfileDraft,
  profileId?: string,
): ApiProfile {
  return {
    id: profileId ?? crypto.randomUUID(),
    name: validateProfileName(draft.name),
    baseUrl: validateBaseUrl(draft.baseUrl),
    apiKey: validateApiKey(draft.apiKey),
    model: validateModel(draft.model),
    timeoutMs: parseTimeoutMs(draft.timeoutMs),
    enableStreaming: Boolean(draft.enableStreaming),
    customHeadersJson: normalizeCustomHeaders(draft.customHeadersJson),
    enabled: Boolean(draft.enabled),
  };
}

export function toProfileDraft(profile?: ApiProfile): ProfileDraft {
  return {
    name: profile?.name ?? "",
    baseUrl: profile?.baseUrl ?? "https://api.openai.com/v1",
    apiKey: profile?.apiKey ?? "",
    model: profile?.model ?? "",
    timeoutMs: String(profile?.timeoutMs ?? 30000),
    enableStreaming: profile?.enableStreaming ?? true,
    customHeadersJson: profile?.customHeadersJson ?? "",
    enabled: profile?.enabled ?? true,
  };
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "*".repeat(apiKey.length);
  }

  const head = apiKey.slice(0, 4);
  const tail = apiKey.slice(-4);
  return `${head}${"*".repeat(apiKey.length - 8)}${tail}`;
}
