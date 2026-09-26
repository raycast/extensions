export type Bump = "patch" | "minor" | "major";

/**
 * Next semver tag after `last`. Keeps the existing "v" prefix convention.
 * Returns "v0.0.1" when there are no releases yet, and `null` when the latest
 * release exists but isn't semver (so the caller can refuse rather than guess).
 */
export function nextTag(last: string, bump: Bump): string | null {
  const trimmed = last.trim();
  if (!trimmed) return "v0.0.1";
  // end-anchored on purpose — "v1.4.2fix" and "v1.4.2.5" must not pass
  const m = /^(v?)(\d+)\.(\d+)\.(\d+)$/.exec(trimmed);
  if (!m) return null;
  const prefix = m[1];
  let [major, minor, patch] = [Number(m[2]), Number(m[3]), Number(m[4])];
  if (bump === "patch") patch += 1;
  if (bump === "minor") {
    minor += 1;
    patch = 0;
  }
  if (bump === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  }
  return `${prefix}${major}.${minor}.${patch}`;
}
