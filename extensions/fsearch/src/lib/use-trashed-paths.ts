import { useState } from "react";

/** Keeps trashed results hidden while the daemon's index catches up. */
export function useTrashedPaths() {
  const [trashedPaths, setTrashedPaths] = useState<string[]>([]);

  return {
    onTrash: (path: string) => setTrashedPaths((paths) => [...paths, path]),
    isVisible: (path: string) => !trashedPaths.some((trashed) => path === trashed || path.startsWith(`${trashed}/`)),
  };
}
