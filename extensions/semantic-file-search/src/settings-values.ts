/** Refresh server-owned fields without overwriting an actual user draft. */
export function reconcileValues<T extends object>(
  draft: T | undefined,
  previousServer: T | undefined,
  currentServer: T,
  submission?: { edited: ReadonlySet<keyof T>; complete: boolean },
): T {
  if (!draft) return currentServer;
  if (!previousServer) return draft;
  const next = { ...draft };
  for (const key of Object.keys(currentServer) as (keyof T)[]) {
    if (submission) {
      // Explicit edits survive even when a user returns to an earlier server value.
      // Untouched fields can follow repeated server updates during the running job.
      if (
        !submission.edited.has(key) &&
        (submission.complete ||
          sameSettingsValue(draft[key], previousServer[key]))
      )
        next[key] = currentServer[key];
    } else if (sameSettingsValue(draft[key], previousServer[key])) {
      next[key] = currentServer[key];
    }
  }
  return next;
}

/** Native folder dialogs return the new selection, not every saved exclusion. */
export function addExclusionFolders(
  current: string[],
  selected: string[],
): string[] {
  return [...new Set([...current, ...selected])];
}

export function sameSettingsValue(left: unknown, right: unknown): boolean {
  return Array.isArray(left) && Array.isArray(right)
    ? JSON.stringify(left) === JSON.stringify(right)
    : left === right;
}

/** Keep native picker paths exact; manual lists also accept escaped JSON paths. */
export function formatFolderPaths(paths: string[]): string {
  return paths.some((path) => /[\r\n]/.test(path) || path.trim() !== path)
    ? JSON.stringify(paths, null, 2)
    : paths.join("\n");
}

export function parseFolderPaths(text: string): string[] {
  if (text.trimStart().startsWith("[")) {
    const paths: unknown = JSON.parse(text);
    if (
      !Array.isArray(paths) ||
      paths.some((path) => typeof path !== "string" || !path.length)
    )
      throw new Error("Enter a JSON array of nonempty folder paths.");
    return [...new Set(paths)] as string[];
  }
  return [
    ...new Set(
      text
        .split(/\r?\n/)
        .map((path) => path.trim())
        .filter(Boolean),
    ),
  ];
}

/** Engine 0.5.0 trims input strings. A directory separator protects trailing whitespace. */
export function folderRequestPaths(paths: string[]): string[] {
  return paths.map((path) => (/\s$/.test(path) ? `${path}/` : path));
}

/** Ignore snapshots from before/during a settings mutation, including failed mutations. */
export class SettingsPollGuard {
  revision = 0;
  pending = false;

  begin() {
    this.pending = true;
    this.revision += 1;
  }

  end() {
    this.revision += 1;
    this.pending = false;
  }

  accepts(revision: number) {
    return !this.pending && revision === this.revision;
  }
}
