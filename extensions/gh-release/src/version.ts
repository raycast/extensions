export type Bump = "patch" | "minor" | "major";

/** Next semver tag after `last`. Keeps the existing "v" prefix convention. */
export function nextTag(last: string, bump: Bump): string {
  const m = /^(v?)(\d+)\.(\d+)\.(\d+)/.exec(last.trim());
  if (!m) return "v0.0.1";
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
