export function parseProjectRefs(raw?: string): string[] | undefined {
  if (!raw) return undefined;

  const refs = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return refs.length > 0 ? refs : undefined;
}

export function hasProjectScopeFilter(input: {
  groupName?: string;
  projectRefs?: string[];
}): boolean {
  return (
    Boolean(input.groupName?.trim()) || (input.projectRefs?.length ?? 0) > 0
  );
}
