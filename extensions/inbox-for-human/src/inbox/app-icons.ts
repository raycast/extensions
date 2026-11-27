/**
 * Row icons: the app a file opens in, when macOS knows one.
 */

type AppLookup = (path: string) => Promise<{ path: string }>;

/**
 * Map each file to the app it opens in by default. A file with no known app
 * (a missing file, an unknown type) is left out.
 */
export async function findAppPaths(paths: string[], lookup: AppLookup): Promise<Record<string, string>> {
  const found = await Promise.all(
    [...new Set(paths)].map(async (path) => {
      try {
        return [path, (await lookup(path)).path] as const;
      } catch {
        return [path, ""] as const;
      }
    }),
  );
  return Object.fromEntries(found.filter(([, app]) => app));
}

/**
 * What to draw a row's icon from: the app, else the file itself.
 */
export function rowIconPath(path: string, apps: Record<string, string> | undefined): string {
  return apps?.[path] ?? path;
}
