/** Branches to show for a dropdown query. Remote hits cover names outside the preloaded pages. */
export function branchesForQuery(
  base: string[],
  remote: string[] | undefined,
  query: string,
  selected?: string,
): string[] {
  const trimmed = query.trim().toLowerCase();
  const local = trimmed ? base.filter((branch) => branch.toLowerCase().includes(trimmed)) : base;
  const matches = trimmed ? [...(remote ?? []), ...local] : local;
  const unique = [...new Set(matches)];

  if (selected && !unique.includes(selected)) {
    return [selected, ...unique];
  }

  return unique;
}
