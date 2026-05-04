import { execFileSync } from "child_process";

export function resolveLocalizedNames(paths: string[]): Map<string, string> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;

  try {
    const raw = execFileSync("mdls", ["-name", "kMDItemDisplayName", ...paths], {
      encoding: "utf8",
    });
    // mdls returns exactly one line per path, in the same order — positional mapping is safe.
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
