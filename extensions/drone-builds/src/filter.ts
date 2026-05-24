import type { DroneBuild, DroneUser } from "./drone";

/**
 * "Mine" = OR across the three identity fields Drone exposes on a build.
 * - sender: who triggered the build (UI restart, drone CLI, webhook actor)
 * - author_login: SCM login of the commit author
 * - author_email: commit author email (catches login-mismatch cases)
 */
export function isMine(
  build: DroneBuild,
  me: Pick<DroneUser, "login" | "email">,
): boolean {
  if (me.login && build.sender === me.login) return true;
  if (me.login && build.author_login === me.login) return true;
  if (me.email && build.author_email === me.email) return true;
  return false;
}

function parseSlugList(csv: string): Set<string> {
  return new Set(
    csv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export interface RepoFilterPrefs {
  includeRepos: string;
  excludeRepos: string;
}

/**
 * Returns true when the repo slug (e.g. "octocat/hello") passes the include/
 * exclude rules. Empty include list = allow everything; exclude always wins.
 */
export function repoMatches(slug: string, prefs: RepoFilterPrefs): boolean {
  const exclude = parseSlugList(prefs.excludeRepos);
  if (exclude.has(slug)) return false;
  const include = parseSlugList(prefs.includeRepos);
  if (include.size === 0) return true;
  return include.has(slug);
}
