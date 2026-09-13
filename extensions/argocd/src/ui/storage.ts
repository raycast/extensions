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
import {
  credentialsInvalidatedBy,
  parseInstances,
  serializeInstances,
  type ArgoInstance,
} from "../lib/config/instances";
import { UNKNOWN_REACHABILITY, type Reachability } from "../lib/argocd/probe";
import { clearInstanceSecrets, type SecretStore } from "../lib/auth/secrets";

const INSTANCES_KEY = "instances/v1";
const RECENTS_KEY = "recents/v1";
const REACHABILITY_KEY = "reachability/v1";
const SCOPE_KEY = "scope/v1";

const MAX_RECENTS = 10;

export async function loadInstances(): Promise<ArgoInstance[]> {
  return parseInstances(await LocalStorage.getItem<string>(INSTANCES_KEY));
}

/**
 * Persists the instances and drops any credential the change has invalidated.
 *
 * The invalidation lives here rather than in the form because this is the one function every
 * write goes through. Editing an instance keeps its id, so its stored session outlives the
 * edit: point it at another server, or switch its auth mode, and the old provider's token is
 * still what gets sent. The token readers cannot catch it, since their common path returns a
 * live session without asking the server anything, and validating the binding there would cost
 * a settings request on every read.
 *
 * It was in the form first, which covered the only editor that exists today and nothing about
 * tomorrow. That is the same shape as the ApplicationSet view growing its own copy of the
 * login branch: correct in one place, absent in the next.
 *
 * The clearing happens after the write, deliberately. Clearing first meant a rejected write
 * left the old configuration in place with its credential already gone, signing the operator
 * out for an edit that never committed. This order can only fail the other way, leaving a
 * saved instance holding a credential it no longer matches, which a new sign-in fixes.
 */
export async function saveInstances(instances: ArgoInstance[]): Promise<void> {
  const previous = await loadInstances();
  const invalidated = instances.filter((next) => {
    const before = previous.find((candidate) => candidate.id === next.id);
    return before !== undefined && credentialsInvalidatedBy(before, next);
  });

  await LocalStorage.setItem(INSTANCES_KEY, serializeInstances(instances));

  // The write is the save. Past this line the configuration is stored, so a failure to clear
  // must not be reported as a failed save: the caller would keep its old state and leave the
  // form open over storage that already changed, and a retry would diff the new list against
  // itself and skip the cleanup for good.
  //
  // Which is why this cleanup is an optimisation and not the safeguard. The safeguard is the
  // `baseUrl` recorded on the session: the token readers compare it locally, with no request,
  // and void a session minted for another server whatever its expiry says. If every call here
  // failed, the invariant would still hold.
  for (const instance of invalidated) {
    try {
      await clearInstanceSecrets(secretStore, instance.id);
    } catch {
      // Deliberately swallowed. The reader catches the mismatch on the next use.
    }
  }
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
