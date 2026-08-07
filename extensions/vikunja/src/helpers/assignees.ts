import { User, getProjectUsers } from "../api";

/** Fields a typed name may match against, in priority order. */
const MATCH_FIELDS = ["username", "name", "email"] as const;

function findByField(
  users: User[],
  field: (typeof MATCH_FIELDS)[number],
  query: string,
  fuzzy: boolean,
): User | undefined {
  const wanted = query.toLowerCase();
  return users.find((u) => {
    const value = u[field]?.toLowerCase();
    if (!value) return false;
    return fuzzy ? value.includes(wanted) : value === wanted;
  });
}

/**
 * Picks the user a typed name refers to.
 *
 * Mirrors the web client: a single search result is matched strictly, so a
 * partial name cannot silently bind the wrong person, while multiple results
 * fall back to a contains match. Username wins over name, which wins over email.
 */
export function matchUser(users: User[], query: string): User | undefined {
  const fuzzy = users.length !== 1;
  for (const field of MATCH_FIELDS) {
    const found = findByField(users, field, query, fuzzy);
    if (found) return found;
  }
  return undefined;
}

export interface ResolvedAssignees {
  /** Users to send with the task. */
  matched: User[];
  /** Typed names that matched a project member, aligned with `matched`. */
  matchedNames: string[];
  /** Typed names with no matching project member. */
  unmatchedNames: string[];
}

/**
 * Resolves typed assignee names against a project's members.
 *
 * Runs one search per name. A name that matches nothing is reported rather than
 * failing the whole flow, since the task is still worth creating.
 */
export async function resolveAssignees(
  names: string[],
  projectId: number,
): Promise<ResolvedAssignees> {
  if (names.length === 0) {
    return { matched: [], matchedNames: [], unmatchedNames: [] };
  }

  const lookups = await Promise.all(
    names.map(async (name) => {
      try {
        const candidates = await getProjectUsers(projectId, name);
        return { name, user: matchUser(candidates, name) };
      } catch {
        // A failed lookup is treated as "not found" so one bad request cannot
        // block task creation.
        return { name, user: undefined };
      }
    }),
  );

  const matched: User[] = [];
  const matchedNames: string[] = [];
  const unmatchedNames: string[] = [];
  const seenIds = new Set<number>();

  lookups.forEach(({ name, user }) => {
    if (!user) {
      unmatchedNames.push(name);
      return;
    }
    if (seenIds.has(user.id)) return;
    seenIds.add(user.id);
    matched.push(user);
    matchedNames.push(name);
  });

  return { matched, matchedNames, unmatchedNames };
}

/** Label for showing a resolved user, preferring the display name. */
export function formatUser(user: User): string {
  return user.name?.trim() || user.username;
}
