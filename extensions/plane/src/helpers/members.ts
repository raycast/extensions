/** The member fields used to resolve a name, email or id to one member. */
export type MatchableMember = { id: string; displayName?: string; name?: string; email?: string | null };

function describeMember(member: MatchableMember) {
  const label = member.displayName || member.name || member.id;
  return member.email ? `${label} (${member.email})` : label;
}

function ambiguous(query: string, candidates: MatchableMember[]) {
  return new Error(
    `"${query}" matches several members: ${candidates.map(describeMember).join(", ")}. Be more specific.`,
  );
}

/**
 * Resolves an id, email, display name or full name (case-insensitive) to one member. Ids and emails are unique and
 * win. A name must match exactly one member, either exactly or as part of a name; otherwise it throws with the
 * candidates, so a duplicate name never silently picks the first one.
 */
export function matchMember<T extends MatchableMember>(members: T[], query: string): T {
  const trimmed = query.trim();
  const needle = trimmed.toLowerCase();

  const byId = members.find((member) => member.id === trimmed);
  if (byId) return byId;
  const byEmail = members.filter((member) => member.email?.toLowerCase() === needle);
  if (byEmail.length === 1) return byEmail[0];
  if (byEmail.length > 1) throw ambiguous(query, byEmail);

  const exact = members.filter(
    (member) => member.displayName?.toLowerCase() === needle || member.name?.toLowerCase() === needle,
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw ambiguous(query, exact);

  const partial = members.filter(
    (member) => member.name?.toLowerCase().includes(needle) || member.displayName?.toLowerCase().includes(needle),
  );
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) throw ambiguous(query, partial);
  throw new Error(`Member "${query}" not found in this project.`);
}
