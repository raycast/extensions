import { LocalStorage } from "@raycast/api";

export interface HostsProfile {
  id: string;
  name: string;
  content: string;
}

export interface HostsStore {
  profiles: HostsProfile[];
  activeProfileId: string | null;
}

const STORAGE_KEY = "hosts-manager:store";

export function emptyStore(): HostsStore {
  return { profiles: [], activeProfileId: null };
}

export async function loadStore(): Promise<HostsStore> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return emptyStore();
  try {
    return normalizeStore(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

export async function saveStore(store: HostsStore): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function activeProfileOf(store: HostsStore): HostsProfile | null {
  return (
    store.profiles.find((profile) => profile.id === store.activeProfileId) ??
    null
  );
}

function normalizeStore(value: unknown): HostsStore {
  if (typeof value !== "object" || value === null) return emptyStore();
  const record = value as Record<string, unknown>;
  const profiles = Array.isArray(record.profiles)
    ? record.profiles.filter(isProfile)
    : [];
  const activeProfileId =
    typeof record.activeProfileId === "string" &&
    profiles.some((profile) => profile.id === record.activeProfileId)
      ? record.activeProfileId
      : null;

  return { profiles, activeProfileId };
}

function isProfile(value: unknown): value is HostsProfile {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.content === "string"
  );
}
