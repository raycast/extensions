const CLOSED_GROUPS: ReadonlySet<string> = new Set(["completed", "cancelled"]);

/** Unknown or missing groups count as open, so nothing silently disappears. */
export function isOpenStateGroup(group: string | undefined | null): boolean {
  return !group || !CLOSED_GROUPS.has(group);
}
