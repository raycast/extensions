import { LocalStorage, getPreferenceValues } from "@raycast/api";

export type GatewayProfile = {
  id: string;
  name: string;
  endpoint: string;
  token: string;
  agentId: string;
  mainKey?: string;
  webUiBaseUrl?: string;
  namespace?: string;
};

type RawPreferences = {
  endpoint: string;
  token: string;
  agentId?: string;
  mainKey?: string;
  webUiBaseUrl?: string;
  profilesJson?: string;
  defaultProfileId?: string;
};

export type ProfileConnectionResult = {
  ok: boolean;
  latencyMs: number;
  statusCode?: number;
  error?: string;
};

const ACTIVE_PROFILE_STORAGE_KEY = "openclaw-active-profile-v1";
const MANAGED_PROFILES_STORAGE_KEY = "openclaw-managed-profiles-v1";
const LEGACY_DEFAULT_ID = "default";
const LEGACY_DEFAULT_NAME = "default";

function sanitizeId(raw: string, fallback: string): string {
  const value = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return value || fallback;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function deriveInstanceNameFromEndpoint(endpoint: string): string {
  const cleaned = trimTrailingSlash(endpoint.trim());
  if (!cleaned) {
    return "Local Instance";
  }
  try {
    const url = new URL(cleaned);
    return url.host || "Local Instance";
  } catch {
    return cleaned.replace(/^https?:\/\//i, "") || "Local Instance";
  }
}

function normalizeProfile(
  input: Partial<GatewayProfile>,
  fallbackId = "default",
): GatewayProfile {
  const id = sanitizeId(String(input.id || fallbackId), fallbackId);
  const endpoint = trimTrailingSlash(String(input.endpoint || "").trim());
  const token = String(input.token || "").trim();
  const agentId = String(input.agentId || "main").trim() || "main";
  const mainKey = String(input.mainKey || "").trim() || undefined;
  const webUiBaseUrl =
    trimTrailingSlash(String(input.webUiBaseUrl || "").trim()) || undefined;
  const namespace = String(input.namespace || "").trim() || undefined;
  const name = String(input.name || id).trim() || id;
  return {
    id,
    name,
    endpoint,
    token,
    agentId,
    mainKey,
    webUiBaseUrl,
    namespace,
  };
}

function isLegacyDefaultProfile(profile: GatewayProfile): boolean {
  return (
    profile.id === LEGACY_DEFAULT_ID &&
    profile.name.trim().toLowerCase() === LEGACY_DEFAULT_NAME
  );
}

function normalizeLegacyDefaultName(profile: GatewayProfile): GatewayProfile {
  if (!isLegacyDefaultProfile(profile)) {
    return profile;
  }
  return {
    ...profile,
    name: deriveInstanceNameFromEndpoint(profile.endpoint),
  };
}

function pruneLegacyDefaultProfile(
  profiles: GatewayProfile[],
): GatewayProfile[] {
  if (profiles.length <= 1) {
    return profiles.map((profile) => normalizeLegacyDefaultName(profile));
  }
  const hasNonDefault = profiles.some(
    (profile) => profile.id !== LEGACY_DEFAULT_ID,
  );
  const normalized = profiles.map((profile) =>
    normalizeLegacyDefaultName(profile),
  );
  if (!hasNonDefault) {
    return normalized;
  }
  return normalized.filter((profile) => !isLegacyDefaultProfile(profile));
}

function dedupeProfiles(profiles: GatewayProfile[]): GatewayProfile[] {
  const seen = new Set<string>();
  const out: GatewayProfile[] = [];
  for (const profile of profiles) {
    if (seen.has(profile.id)) {
      continue;
    }
    seen.add(profile.id);
    out.push(profile);
  }
  return out;
}

function parseProfilesJson(raw: string): GatewayProfile[] {
  if (!raw.trim()) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid profilesJson JSON: ${error instanceof Error ? error.message : "parse failure"}`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid profilesJson JSON: expected an array");
  }
  const profiles: GatewayProfile[] = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const row = parsed[i];
    if (!row || typeof row !== "object") {
      continue;
    }
    const profile = normalizeProfile(
      row as Partial<GatewayProfile>,
      `profile-${i + 1}`,
    );
    if (!profile.endpoint || !profile.token) {
      continue;
    }
    profiles.push(profile);
  }
  return dedupeProfiles(profiles);
}

function buildLegacyFallbackProfile(prefs: RawPreferences): GatewayProfile {
  return normalizeProfile(
    {
      id: "default",
      name: deriveInstanceNameFromEndpoint(prefs.endpoint || ""),
      endpoint: prefs.endpoint,
      token: prefs.token,
      agentId: prefs.agentId || "main",
      mainKey: prefs.mainKey,
      webUiBaseUrl: prefs.webUiBaseUrl,
    },
    "default",
  );
}

export function loadProfilesFromPreferences(): {
  profiles: GatewayProfile[];
  defaultProfileId: string;
} {
  const prefs = getPreferenceValues<RawPreferences>();
  const defaultFromPrefs = sanitizeId(
    String(prefs.defaultProfileId || "default"),
    "default",
  );

  let profiles: GatewayProfile[] = [];
  if (prefs.profilesJson?.trim()) {
    profiles = parseProfilesJson(prefs.profilesJson);
  }
  if (profiles.length === 0) {
    profiles = [buildLegacyFallbackProfile(prefs)];
  }
  profiles = pruneLegacyDefaultProfile(profiles);

  const defaultProfileExists = profiles.some(
    (profile) => profile.id === defaultFromPrefs,
  );
  const defaultProfileId = defaultProfileExists
    ? defaultFromPrefs
    : profiles[0].id;

  return { profiles, defaultProfileId };
}

async function readManagedProfilesFromStorage(): Promise<GatewayProfile[]> {
  const raw = await LocalStorage.getItem<string>(MANAGED_PROFILES_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const normalized = parsed
      .map((row, index) =>
        row && typeof row === "object"
          ? normalizeProfile(
              row as Partial<GatewayProfile>,
              `profile-${index + 1}`,
            )
          : null,
      )
      .filter((row): row is GatewayProfile => Boolean(row))
      .filter((row) => Boolean(row.endpoint && row.token));
    return pruneLegacyDefaultProfile(dedupeProfiles(normalized));
  } catch {
    return [];
  }
}

async function writeManagedProfilesToStorage(
  profiles: GatewayProfile[],
): Promise<void> {
  await LocalStorage.setItem(
    MANAGED_PROFILES_STORAGE_KEY,
    JSON.stringify(profiles),
  );
}

export async function listManagedProfiles(): Promise<GatewayProfile[]> {
  const stored = await readManagedProfilesFromStorage();
  if (stored.length > 0) {
    const cleaned = pruneLegacyDefaultProfile(stored);
    if (JSON.stringify(cleaned) !== JSON.stringify(stored)) {
      await writeManagedProfilesToStorage(cleaned);
    }
    return cleaned;
  }
  const fromPrefs = pruneLegacyDefaultProfile(
    loadProfilesFromPreferences().profiles,
  );
  await writeManagedProfilesToStorage(fromPrefs);
  return fromPrefs;
}

export async function upsertManagedProfile(
  profileInput: Partial<GatewayProfile>,
  opts?: { existingId?: string },
): Promise<GatewayProfile[]> {
  const current = await listManagedProfiles();
  const idSeed =
    opts?.existingId || profileInput.id || `profile-${current.length + 1}`;
  const normalized = normalizeProfile(
    {
      ...profileInput,
      id: opts?.existingId || profileInput.id || idSeed,
    },
    sanitizeId(String(idSeed), `profile-${current.length + 1}`),
  );

  if (!normalized.endpoint) {
    throw new Error("Profile endpoint is required");
  }
  if (!normalized.token) {
    throw new Error("Profile token is required");
  }

  const next = [...current];
  const targetId = opts?.existingId || normalized.id;
  const index = next.findIndex((profile) => profile.id === targetId);
  if (index >= 0) {
    next[index] = {
      ...normalized,
      id: targetId,
    };
  } else {
    next.push(normalized);
  }

  const finalProfiles = pruneLegacyDefaultProfile(dedupeProfiles(next));
  await writeManagedProfilesToStorage(finalProfiles);
  return finalProfiles;
}

export async function deleteManagedProfile(
  profileId: string,
): Promise<GatewayProfile[]> {
  const current = await listManagedProfiles();
  if (current.length <= 1) {
    throw new Error("At least one profile is required");
  }
  const next = current.filter((profile) => profile.id !== profileId);
  if (next.length === current.length) {
    throw new Error(`Profile not found: ${profileId}`);
  }
  await writeManagedProfilesToStorage(next);
  return next;
}

export async function getStoredActiveProfileId(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(ACTIVE_PROFILE_STORAGE_KEY);
  if (!value) {
    return undefined;
  }
  return sanitizeId(value, "default");
}

export async function setStoredActiveProfileId(
  profileId: string,
): Promise<void> {
  await LocalStorage.setItem(
    ACTIVE_PROFILE_STORAGE_KEY,
    sanitizeId(profileId, "default"),
  );
}

export async function resolveActiveProfileSelection(): Promise<{
  profiles: GatewayProfile[];
  activeProfile: GatewayProfile;
  activeProfileId: string;
}> {
  const profiles = await listManagedProfiles();
  const { defaultProfileId } = loadProfilesFromPreferences();
  const stored = await getStoredActiveProfileId();
  const activeId =
    stored && profiles.some((profile) => profile.id === stored)
      ? stored
      : defaultProfileId;
  const activeProfile =
    profiles.find((profile) => profile.id === activeId) || profiles[0];

  if (activeProfile.id !== stored) {
    await setStoredActiveProfileId(activeProfile.id);
  }

  return { profiles, activeProfile, activeProfileId: activeProfile.id };
}

export function resolveWebUiBaseUrl(profile: GatewayProfile): string {
  const raw = (profile.webUiBaseUrl || "").trim();
  if (raw) {
    return trimTrailingSlash(raw);
  }
  return trimTrailingSlash(profile.endpoint);
}

export function buildWebUiUrl(
  profile: GatewayProfile,
  sessionKey?: string,
): string {
  const base = resolveWebUiBaseUrl(profile);
  if (!sessionKey) {
    return base;
  }
  const session = encodeURIComponent(sessionKey);
  if (base.includes("?")) {
    return `${base}&session=${session}`;
  }
  return `${base}?session=${session}`;
}

export async function testProfileConnection(
  profile: GatewayProfile,
): Promise<ProfileConnectionResult> {
  const start = Date.now();

  try {
    const health = await fetch(`${profile.endpoint}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${profile.token}`,
      },
    });
    if (health.ok) {
      return {
        ok: true,
        latencyMs: Date.now() - start,
        statusCode: health.status,
      };
    }
  } catch {
    // Fallback to models endpoint.
  }

  try {
    const models = await fetch(`${profile.endpoint}/v1/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${profile.token}`,
      },
    });
    if (models.ok) {
      return {
        ok: true,
        latencyMs: Date.now() - start,
        statusCode: models.status,
      };
    }
    return {
      ok: false,
      latencyMs: Date.now() - start,
      statusCode: models.status,
      error: `HTTP ${models.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
