export function isSlackUserId(id: string): boolean {
  return id.startsWith("U") || id.startsWith("W");
}

export function getDirectorySearchPageSize(query: string): number {
  return query.trim() ? 999 : 200;
}

export function mergeDirectorySearchResults<User, Channel, Group>(
  users: User[] | undefined,
  conversations: readonly [Channel[], Group[]] | undefined,
): [User[], Channel[], Group[]] | undefined {
  if (!users && !conversations) return undefined;
  return [users ?? [], conversations?.[0] ?? [], conversations?.[1] ?? []];
}

export function rememberVisitedDirectoryItem<T extends { id: string }>(items: readonly T[], item: T): T[] {
  return [item, ...items.filter((entry) => entry.id !== item.id)].slice(0, 100);
}

/**
 * Frecency can only rank rows that are present. Empty queries stop at the first directory page, so recently
 * visited items from later pages are merged back in before sorting.
 */
export function mergeVisitedDirectoryItems<T extends { id: string }>(
  results: T[] | undefined,
  visited: readonly T[],
  query: string,
): T[] | undefined {
  if (query.trim().length > 0 || visited.length === 0) return results;
  const rows = results ?? [];
  const seen = new Set(rows.map((row) => row.id));
  return [...rows, ...visited.filter((item) => !seen.has(item.id))];
}

/** Shares one bounded member scan between user rows and MPIM name resolution for a query. */
export function createDirectoryUserSearch<User>(
  loadMembers: () => Promise<{ users: User[]; userNames: ReadonlyMap<string, string> }>,
) {
  let members: ReturnType<typeof loadMembers> | undefined;
  const getMembers = () => (members ??= loadMembers());
  return {
    getUsers: async () => (await getMembers()).users,
    getUserNames: async () => (await getMembers()).userNames,
  };
}
