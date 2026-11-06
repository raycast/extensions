import { getPreferenceValues } from "@raycast/api";

import { parseSessionTimeoutMinutes, type SessionHelperSnapshot } from "../session-helper/protocol";
import {
  clearSessionHelper,
  getSessionHelperSnapshot,
  lockSessionHelper,
  markActivityInSessionHelper,
  rememberInSessionHelper,
  sessionHelperParams,
  unlockAfterPresenceInSessionHelper,
} from "./session-helper-client";

export type ExtensionSessionState = "disabled" | "empty" | "active" | "locked";

export { parseSessionTimeoutMinutes } from "../session-helper/protocol";

const GLOBAL_VAULT_KEY = "__vaultcastExtensionSession";

type SessionListener = () => void;

interface VaultRuntime {
  /** Held only while the session is unlocked; cleared on lock and re-fetched after a presence check. */
  credentialsByAdapter: Map<string, Record<string, string>>;
  rememberedAdapterIds: Set<string>;
  listeners: Set<SessionListener>;
  locked: boolean;
  lastActivityAt: number;
  hydratedFromHelper: boolean;
}

function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

function helperConfig(): { timeoutMinutes: number; enabled: boolean } {
  return sessionHelperParams(
    parseSessionTimeoutMinutes(preferences().sessionTimeoutMinutes),
    isExtensionSessionEnabled(),
  );
}

function runtime(): VaultRuntime {
  const globalState = globalThis as typeof globalThis & { [GLOBAL_VAULT_KEY]?: VaultRuntime };
  if (!globalState[GLOBAL_VAULT_KEY]) {
    globalState[GLOBAL_VAULT_KEY] = {
      credentialsByAdapter: new Map(),
      rememberedAdapterIds: new Set(),
      listeners: new Set(),
      locked: false,
      lastActivityAt: 0,
      hydratedFromHelper: false,
    };
  }

  return globalState[GLOBAL_VAULT_KEY];
}

function cloneCredentials(credentials: Record<string, string>): Record<string, string> {
  return { ...credentials };
}

function notifySessionListeners(): void {
  for (const listener of runtime().listeners) {
    listener();
  }
}

function applySnapshot(snapshot: SessionHelperSnapshot): void {
  const state = runtime();
  state.credentialsByAdapter = new Map(
    Object.entries(snapshot.credentialsByAdapter ?? {}).filter(([, value]) => value && typeof value === "object"),
  );
  state.rememberedAdapterIds = new Set([
    ...(Array.isArray(snapshot.rememberedAdapterIds) ? snapshot.rememberedAdapterIds : []),
    ...state.credentialsByAdapter.keys(),
  ]);
  state.locked = snapshot.locked === true;
  state.lastActivityAt = typeof snapshot.lastActivityAt === "number" ? snapshot.lastActivityAt : 0;
}

export function isExtensionSessionEnabled(): boolean {
  return preferences().enableExtensionSession !== false;
}

export function getExtensionSessionTimeoutMs(): number {
  return parseSessionTimeoutMinutes(preferences().sessionTimeoutMinutes) * 60_000;
}

export async function hydrateCredentialVault(): Promise<void> {
  const state = runtime();
  if (state.hydratedFromHelper) {
    return;
  }

  if (!isExtensionSessionEnabled()) {
    state.hydratedFromHelper = true;
    return;
  }

  try {
    const snapshot = await getSessionHelperSnapshot(helperConfig());
    applySnapshot(snapshot);
  } catch {
    // Fall back to an empty local session if the helper is unavailable.
  }

  state.hydratedFromHelper = true;
  notifySessionListeners();
}

export function subscribeToExtensionSession(listener: SessionListener): () => void {
  const state = runtime();
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}

export function rememberCredentials(adapterId: string, credentials: Record<string, string>): void {
  if (!isExtensionSessionEnabled()) {
    return;
  }

  const state = runtime();
  state.credentialsByAdapter.set(adapterId, cloneCredentials(credentials));
  state.rememberedAdapterIds.add(adapterId);
  state.locked = false;
  state.lastActivityAt = Date.now();
  notifySessionListeners();

  void rememberInSessionHelper({
    adapterId,
    credentials: cloneCredentials(credentials),
    ...helperConfig(),
  }).catch(() => {
    // Helper sync is best-effort; local cache still works within this process.
  });
}

export function hasRememberedCredentials(adapterId: string): boolean {
  return runtime().rememberedAdapterIds.has(adapterId);
}

export function peekCredentials(adapterId: string): Record<string, string> | undefined {
  if (getExtensionSessionState() !== "active") {
    return undefined;
  }

  const stored = runtime().credentialsByAdapter.get(adapterId);
  return stored ? cloneCredentials(stored) : undefined;
}

export function lockExtensionSession(): void {
  const state = runtime();
  if (!isExtensionSessionEnabled() || state.rememberedAdapterIds.size === 0 || state.locked) {
    return;
  }

  state.locked = true;
  state.credentialsByAdapter.clear();
  notifySessionListeners();
  void lockSessionHelper().catch(() => undefined);
}

/** Call only after `confirmPresence()` succeeded: the helper releases the locked credentials in response. */
export async function unlockExtensionSessionAfterPresence(): Promise<void> {
  if (runtime().rememberedAdapterIds.size === 0) {
    return;
  }

  applySnapshot(await unlockAfterPresenceInSessionHelper());
  notifySessionListeners();
}

export function clearRememberedCredentials(adapterId?: string): void {
  const state = runtime();
  if (adapterId) {
    state.credentialsByAdapter.delete(adapterId);
    state.rememberedAdapterIds.delete(adapterId);
  } else {
    state.credentialsByAdapter.clear();
    state.rememberedAdapterIds.clear();
  }

  if (state.rememberedAdapterIds.size === 0) {
    state.locked = false;
    state.lastActivityAt = 0;
  }

  notifySessionListeners();
  void clearSessionHelper(adapterId).catch(() => undefined);
}

export function markSessionActivity(): void {
  if (lockExtensionSessionIfExpired()) {
    return;
  }

  const state = runtime();
  if (!isExtensionSessionEnabled() || state.locked || state.rememberedAdapterIds.size === 0) {
    return;
  }

  state.lastActivityAt = Date.now();
  void markActivityInSessionHelper(helperConfig()).catch(() => undefined);
}

export function isExtensionSessionExpired(): boolean {
  const state = runtime();
  if (
    !isExtensionSessionEnabled() ||
    state.locked ||
    state.rememberedAdapterIds.size === 0 ||
    state.lastActivityAt === 0
  ) {
    return false;
  }

  return Date.now() - state.lastActivityAt >= getExtensionSessionTimeoutMs();
}

export function lockExtensionSessionIfExpired(): boolean {
  if (!isExtensionSessionExpired()) {
    return false;
  }

  lockExtensionSession();
  return true;
}

export function getExtensionSessionState(): ExtensionSessionState {
  if (!isExtensionSessionEnabled()) {
    return "disabled";
  }

  const state = runtime();
  if (state.rememberedAdapterIds.size === 0) {
    return "empty";
  }

  if (state.locked || isExtensionSessionExpired()) {
    return "locked";
  }

  return "active";
}
