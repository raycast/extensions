// Generated from shared/shortcuts-core; run scripts/sync-shortcuts-core.mjs --write.
export function resolveOverlayField<T>(
  base: T | undefined,
  replacement: T | null | undefined,
  cleared = false
): T | undefined {
  if (cleared) return undefined;
  return replacement ?? base;
}
export function overlayIdentityKey(baseKey: string, id: string): string {
  return `${baseKey}:${id}`;
}
