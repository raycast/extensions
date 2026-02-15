import path from "node:path";

interface CompiledExclude {
  absolutePrefix?: string;
  matcher: RegExp;
  matchRelativePath: boolean;
}

function toPosix(input: string): string {
  return input.replace(/\\/g, "/");
}

function normalizeForCompare(input: string): string {
  return toPosix(input).toLowerCase();
}

function escapeRegex(input: string): string {
  return input.replace(/[|\\{}()[\]^$+?.*]/g, "\\$&");
}

function wildcardToRegex(pattern: string): RegExp {
  const source = escapeRegex(pattern).replace(/\\\*/g, ".*");
  return new RegExp(`^${source}$`, "i");
}

function compileExcludes(searchExcludes: string[]): CompiledExclude[] {
  const compiled: CompiledExclude[] = [];

  for (const rawPattern of searchExcludes) {
    const trimmed = rawPattern.trim();
    if (!trimmed) continue;

    if (path.isAbsolute(trimmed)) {
      compiled.push({
        absolutePrefix: normalizeForCompare(path.resolve(trimmed)),
        matcher: wildcardToRegex("*"),
        matchRelativePath: false,
      });
      continue;
    }

    const normalizedPattern = toPosix(
      trimmed.replace(/^\.\/+/, "").replace(/^\/+/, ""),
    );
    compiled.push({
      matcher: wildcardToRegex(normalizedPattern),
      matchRelativePath: normalizedPattern.includes("/"),
    });
  }

  return compiled;
}

export function getRelativeDepth(root: string, filePath: string): number {
  const relative = toPosix(path.relative(root, filePath));
  if (relative === "" || relative === ".") return 0;
  if (relative.startsWith("../") || relative === "..")
    return Number.POSITIVE_INFINITY;
  return relative.split("/").filter(Boolean).length;
}

function matchesCompiledExcludes(
  filePath: string,
  root: string,
  excludes: CompiledExclude[],
): boolean {
  if (excludes.length === 0) return false;

  const absolutePath = normalizeForCompare(path.resolve(filePath));
  const relativePath = normalizeForCompare(
    toPosix(path.relative(root, filePath)),
  );
  const segments = relativePath.split("/").filter(Boolean);

  for (const exclude of excludes) {
    if (exclude.absolutePrefix) {
      if (
        absolutePath === exclude.absolutePrefix ||
        absolutePath.startsWith(`${exclude.absolutePrefix}/`)
      ) {
        return true;
      }
      continue;
    }

    if (relativePath.startsWith("../") || relativePath === "..") {
      continue;
    }

    if (exclude.matchRelativePath) {
      if (exclude.matcher.test(relativePath)) {
        return true;
      }
      continue;
    }

    if (segments.some((segment) => exclude.matcher.test(segment))) {
      return true;
    }
  }

  return false;
}

export function isPathExcluded(
  filePath: string,
  root: string,
  searchExcludes: string[],
): boolean {
  return matchesCompiledExcludes(
    filePath,
    root,
    compileExcludes(searchExcludes),
  );
}

export function createPathExcluder(
  searchExcludes: string[],
): (filePath: string, root: string) => boolean {
  const compiled = compileExcludes(searchExcludes);
  return (filePath: string, root: string) =>
    matchesCompiledExcludes(filePath, root, compiled);
}
