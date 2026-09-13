export function resolveApiKey(
  prefKey: string | null | undefined,
): string | null {
  const key = prefKey?.trim();
  return key && key.length > 0 ? key : null;
}
