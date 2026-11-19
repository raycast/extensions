/**
 * Build a GitHub search filter scoped to the given owners.
 * GitHub ORs repeated `user:`/`org:` qualifiers, so the result matches repositories owned by any of them.
 */
export function buildOwnerSearchFilter(owners: {
  userLogin?: string | null;
  orgLogins?: (string | null | undefined)[];
}) {
  const qualifiers = [
    ...(owners.userLogin ? [`user:${owners.userLogin}`] : []),
    ...(owners.orgLogins ?? []).filter((login): login is string => !!login).map((login) => `org:${login}`),
  ];

  return qualifiers.join(" ");
}

/**
 * Check whether a repository's `owner/name` belongs to one of the owners in a `user:`/`org:` search filter.
 * Returns `true` when the filter contains no owner qualifiers.
 */
export function matchesOwnerSearchFilter(nameWithOwner: string, searchFilter: string | null | undefined) {
  const owners = (searchFilter ?? "")
    .split(/\s+/)
    .map((qualifier) => /^(?:user|org):(.+)$/i.exec(qualifier)?.[1]?.toLowerCase())
    .filter((login): login is string => !!login);

  if (owners.length === 0) {
    return true;
  }

  const owner = nameWithOwner.split("/")[0]?.toLowerCase();
  return owners.includes(owner);
}
