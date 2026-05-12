export function parseProjectRefs(raw?: string): string[] | undefined {
  if (!raw) return undefined;

  const refs = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return refs.length > 0 ? refs : undefined;
}
