/**
 * Everything the extension persists through Raycast, credentials included.
 *
 * Raycast's documentation describes this storage as a "local encrypted database" whose contents
 * "can only be accessed by the corresponding extension", and names `password` preferences as
 * the way to ask for "values such as access tokens". An earlier version of this file asserted
 * the opposite and sent credentials through the macOS keychain instead; that claim was never
 * checked and was wrong. See lib/auth/secrets.ts.
 */

import { LocalStorage } from "@raycast/api";
import { parseInstances, serializeInstances, type ArgoInstance } from "../lib/config/instances";
import { UNKNOWN_REACHABILITY, type Reachability } from "../lib/argocd/probe";
import type { SecretStore } from "../lib/auth/secrets";

const INSTANCES_KEY = "instances/v1";
const RECENTS_KEY = "recents/v1";
const REACHABILITY_KEY = "reachability/v1";
const SCOPE_KEY = "scope/v1";

const MAX_RECENTS = 10;

export async function loadInstances(): Promise<ArgoInstance[]> {
  return parseInstances(await LocalStorage.getItem<string>(INSTANCES_KEY));
}

export async function saveInstances(instances: ArgoInstance[]): Promise<void> {
  await LocalStorage.setItem(INSTANCES_KEY, serializeInstances(instances));
}

export async function loadRecentKeys(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(RECENTS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

export async function pushRecentKey(key: string): Promise<void> {
  const existing = await loadRecentKeys();
  const next = [key, ...existing.filter((candidate) => candidate !== key)].slice(0, MAX_RECENTS);
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

export async function loadReachability(): Promise<Record<string, Reachability>> {
  const raw = await LocalStorage.getItem<string>(REACHABILITY_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, Reachability> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const entry = value as Partial<Reachability>;
      if (entry && (entry.state === "reachable" || entry.state === "unreachable")) {
        result[id] = { ...UNKNOWN_REACHABILITY, ...entry, state: entry.state };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export async function saveReachability(map: Record<string, Reachability>): Promise<void> {
  await LocalStorage.setItem(REACHABILITY_KEY, JSON.stringify(map));
}

/** The scope dropdown survives a relaunch: an operator who works in one instance stays there. */
export async function loadScope(): Promise<string> {
  return (await LocalStorage.getItem<string>(SCOPE_KEY)) ?? "all";
}

export async function saveScope(scope: string): Promise<void> {
  await LocalStorage.setItem(SCOPE_KEY, scope);
}

/**
 * The credential store the auth layer is given. Raycast keeps these in the same encrypted,
 * extension-private database as everything else above.
 */
export const secretStore: SecretStore = {
  read: (key) => LocalStorage.getItem<string>(key),
  write: (key, value) => LocalStorage.setItem(key, value),
  clear: (key) => LocalStorage.removeItem(key),
};
