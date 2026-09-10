import { useRef, useState } from "react";
import { Entry } from "../lib/types";
import { rowIdForEntry } from "../lib/entry-identity";

/** Follow the first result until the user selects another; restore saved paths once. */
export function useFolderSelection(
  initialPath: string | undefined,
  rows: { entry: Entry }[],
  generation: number,
  query: string,
  restorationRevision = 0,
  selectFirst = false,
) {
  const firstFocus = useRef<
    { path: string; userSelected: boolean } | undefined
  >(undefined);
  const [request, setRequest] = useState({
    revision: restorationRevision,
    query,
    path: initialPath,
    retainedPath: initialPath,
    pending: true,
    ready: false,
  });
  if (request.revision !== restorationRevision) {
    firstFocus.current = undefined;
    setRequest({
      revision: restorationRevision,
      query,
      path: initialPath,
      retainedPath: initialPath,
      pending: true,
      ready: false,
    });
  } else if (request.query !== query && request.pending) {
    setRequest({ ...request, pending: false });
  }
  const selection = useRef<
    | {
        query: string;
        path?: string;
      }
    | undefined
  >(undefined);
  const target =
    query === request.query && request.pending
      ? request.path
        ? rows.find(({ entry }) => entry.path === request.path)
        : selectFirst
          ? rows[0]
          : undefined
      : undefined;
  const targetId = target ? rowIdForEntry(generation, target.entry) : undefined;
  const followFirst =
    request.pending && query === request.query && !request.path && selectFirst;

  return {
    // Do not echo native selections after the user takes control.
    selectedId: request.ready ? (targetId ?? null) : null,
    retainedPath: query === request.query ? request.retainedPath : undefined,
    getSelectedPath: () =>
      followFirst && !firstFocus.current?.userSelected
        ? target?.entry.path
        : selection.current?.query === query
          ? selection.current.path
          : target?.entry.path,
    onSelectionChange: (id: string | null) => {
      const entry = rows.find(
        ({ entry }) => rowIdForEntry(generation, entry) === id,
      )?.entry;
      if (id !== null && !entry) return;
      selection.current = { query, path: entry?.path };
      // The first native selection confirms that the new rows are registered.
      if (entry && request.pending && !request.ready)
        setRequest({ ...request, ready: true });
      if (followFirst) {
        if (entry && id === targetId) {
          firstFocus.current = { path: entry.path, userSelected: false };
        } else if (
          entry &&
          firstFocus.current &&
          entry.path !== firstFocus.current.path
        ) {
          firstFocus.current.userSelected = true;
          setRequest({ ...request, pending: false });
        }
      } else if (targetId && id === targetId)
        setRequest({ ...request, pending: false });
    },
  };
}
