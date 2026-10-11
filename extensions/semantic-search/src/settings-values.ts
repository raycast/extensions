/** Refresh server-owned fields without overwriting an actual user draft. */
export function reconcileValues<T extends object>(
  draft: T | undefined,
  previousServer: T | undefined,
  currentServer: T,
): T {
  if (!draft) return currentServer;
  if (!previousServer) return draft;
  const next = { ...draft };
  for (const key of Object.keys(currentServer) as (keyof T)[]) {
    if (draft[key] === previousServer[key]) next[key] = currentServer[key];
  }
  return next;
}

/** Native folder dialogs return the new selection, not every saved exclusion. */
export function addExclusionFolders(
  current: string,
  selected: string[],
): string {
  return [
    ...new Set(
      [...current.split(/\r?\n/), ...selected]
        .map((path) => path.trim())
        .filter(Boolean),
    ),
  ].join("\n");
}
