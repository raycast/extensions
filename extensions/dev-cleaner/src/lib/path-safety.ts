import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export const PROJECT_ARTIFACT_NAMES = new Set(["node_modules", ".next", "dist", "build", "target"]);

export function isPathInside(candidate: string, parent: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

export async function assertSafeTrashPath(
  candidate: string,
  options: { homeDirectory: string; allowedRoots: string[]; expectedNames?: ReadonlySet<string> },
): Promise<void> {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedHome = path.resolve(options.homeDirectory);
  if (resolvedCandidate === path.parse(resolvedCandidate).root || resolvedCandidate === resolvedHome) {
    throw new Error("Refusing to trash a root or home directory");
  }

  const stats = await lstat(resolvedCandidate);
  const comparisonPath = stats.isSymbolicLink() ? resolvedCandidate : await realpath(resolvedCandidate);
  const canonicalRoots = await Promise.all(
    options.allowedRoots.map(async (root) => {
      try {
        return await realpath(root);
      } catch {
        return path.resolve(root);
      }
    }),
  );
  const allowed = [...canonicalRoots, ...options.allowedRoots.map((root) => path.resolve(root))];
  if (!allowed.some((root) => isPathInside(comparisonPath, root))) {
    throw new Error("Refusing to trash a path outside the configured cleanup roots");
  }
  if (options.expectedNames && !options.expectedNames.has(path.basename(resolvedCandidate))) {
    throw new Error("Refusing to trash a path whose name is not allowlisted");
  }
}
