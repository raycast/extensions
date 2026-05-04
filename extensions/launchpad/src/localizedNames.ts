import { execSync } from "child_process";

// Resolve system-localized display names for app paths via Spotlight metadata.
// getApplications() returns English bundle names; kMDItemDisplayName reflects
// the current locale (e.g. "密码" for Passwords.app on zh-Hans systems).
export function resolveLocalizedNames(paths: string[]): Map<string, string> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;

  try {
    const quoted = paths.map((p) => `"${p.replace(/"/g, '\\"')}"`).join(" ");
    const raw = execSync(`mdls -name kMDItemDisplayName ${quoted}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    // Each line: kMDItemDisplayName = "密码.app"  or  kMDItemDisplayName = (null)
    const names = raw
      .trim()
      .split("\n")
      .map((line) => {
        const m = line.match(/kMDItemDisplayName = "(.+?)(?:\.app)?"\s*$/);
        return m ? m[1] : null;
      });

    paths.forEach((p, i) => {
      if (names[i]) result.set(p, names[i]!);
    });
  } catch {
    // Fall back to bundle name — caller handles missing entries
  }

  return result;
}
