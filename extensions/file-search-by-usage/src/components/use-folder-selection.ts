import { useRef, useState } from "react";
import { Entry } from "../lib/types";
import { rowIdForEntry } from "../lib/entry-identity";

/** Select the folder we came from once its row arrives, without pinning selection. */
export function useFolderSelection(
  initialPath: string | undefined,
  rows: { entry: Entry }[],
  generation: number,
  query: string,
  restorationRevision = 0,
) {
  const [request, setRequest] = useState({
    revision: restorationRevision,
    query,
    path: initialPath,
    retainedPath: initialPath,
  });
  if (request.revision !== restorationRevision) {
    setRequest({
      revision: restorationRevision,
      query,
      path: initialPath,
      retainedPath: initialPath,
    });
  } else if (request.query !== query && request.path !== undefined) {
    setRequest({ ...request, path: undefined });
  }
  const selection = useRef<
    | {
        query: string;
        path?: string;
      }
    | undefined
  >(undefined);
  const target =
    query === request.query && request.path
      ? rows.find(({ entry }) => entry.path === request.path)
      : undefined;
  const targetId = target ? rowIdForEntry(generation, target.entry) : undefined;

  return {
    // Only navigation requests control Raycast selection. Native notifications
    // are observations, not new commands to select and scroll the same row.
    selectedId: targetId ?? null,
    retainedPath: query === request.query ? request.retainedPath : undefined,
    getSelectedPath: () =>
      selection.current?.query === query
        ? selection.current.path
        : target?.entry.path,
    onSelectionChange: (id: string | null) => {
      const entry = rows.find(
        ({ entry }) => rowIdForEntry(generation, entry) === id,
      )?.entry;
      if (id !== null && !entry) return;
      selection.current = { query, path: entry?.path };
      if (targetId && id === targetId)
        setRequest({ ...request, path: undefined });
    },
  };
}
