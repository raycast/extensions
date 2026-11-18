import { createHash } from "crypto";
import { useSyncExternalStore } from "react";

export type AccessLevel = "read-only" | "full-access";

const sessionReadOnlyKeys = new Set<string>();
const accessListeners = new Set<() => void>();

function notifyAccessListeners() {
  for (const listener of accessListeners) {
    listener();
  }
}

export function hasConfiguredWriteAccess(accessLevel: AccessLevel): boolean {
  return accessLevel === "full-access";
}

export function getAccessKeyScope(accessKeyId: string, accessKeySecret: string): string {
  return createHash("sha256").update(`${accessKeyId}:${accessKeySecret}`).digest("hex").slice(0, 32);
}

export function getEffectiveAccessLevel(configuredAccessLevel: AccessLevel, accessKeyScope: string): AccessLevel {
  return sessionReadOnlyKeys.has(accessKeyScope) ? "read-only" : configuredAccessLevel;
}

export function markSessionReadOnly(accessKeyScope: string) {
  if (sessionReadOnlyKeys.has(accessKeyScope)) {
    return;
  }

  sessionReadOnlyKeys.add(accessKeyScope);
  notifyAccessListeners();
}

export function resetSessionAccessOverride() {
  if (sessionReadOnlyKeys.size === 0) {
    return;
  }

  sessionReadOnlyKeys.clear();
  notifyAccessListeners();
}

export function subscribeToAccessLevel(listener: () => void) {
  accessListeners.add(listener);

  return () => {
    accessListeners.delete(listener);
  };
}

export function useEffectiveAccessLevel(configuredAccessLevel: AccessLevel, accessKeyScope: string): AccessLevel {
  return useSyncExternalStore(
    subscribeToAccessLevel,
    () => getEffectiveAccessLevel(configuredAccessLevel, accessKeyScope),
    () => getEffectiveAccessLevel(configuredAccessLevel, accessKeyScope),
  );
}

export function useWriteAccess(configuredAccessLevel: AccessLevel, accessKeyScope: string): boolean {
  const effectiveAccessLevel = useEffectiveAccessLevel(configuredAccessLevel, accessKeyScope);

  return hasConfiguredWriteAccess(effectiveAccessLevel);
}
