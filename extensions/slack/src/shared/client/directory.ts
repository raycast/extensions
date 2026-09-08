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
