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

/** Shares one compact user search result between user rows and MPIM name resolution for a query. */
export function createDirectoryUserSearch<User extends { username: string; name: string }>(
  loadUsers: () => Promise<User[]>,
) {
  let users: Promise<User[]> | undefined;
  const getUsers = () => (users ??= loadUsers());
  return {
    getUsers,
    getUserNames: async (): Promise<ReadonlyMap<string, string>> =>
      new Map((await getUsers()).map((user) => [user.username, user.name])),
  };
}
