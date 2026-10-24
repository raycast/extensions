import os from "node:os";
import path from "node:path";

/** Preserve folder names and avoid scanning nested roots twice. */
export function normalizeIndexRoots(folders: string[]): string[] {
  const roots = [
    ...new Set(
      folders
        .filter((folder) => folder.length > 0)
        .map((folder) =>
          path.resolve(
            folder === "~"
              ? os.homedir()
              : folder.startsWith("~/")
                ? path.join(os.homedir(), folder.slice(2))
                : folder,
          ),
        ),
    ),
  ];

  return roots.filter(
    (root) =>
      !roots.some((parent) => {
        if (parent === root) return false;
        const relative = path.relative(parent, root);
        return (
          relative.length > 0 &&
          relative !== ".." &&
          !relative.startsWith(".." + path.sep) &&
          !path.isAbsolute(relative)
        );
      }),
  );
}

/** Explicit folder selection must recover even from an unreadable old index. */
export async function selectRebuildRoots(
  selectedRoots: string[] | undefined,
  fallback: () => Promise<string[]>,
): Promise<string[]> {
  return selectedRoots === undefined
    ? fallback()
    : normalizeIndexRoots(selectedRoots);
}
