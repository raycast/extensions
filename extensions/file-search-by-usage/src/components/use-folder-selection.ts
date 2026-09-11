import { useEffect, useRef, useState } from "react";
import { Entry } from "../lib/types";
import { rowIdForEntry } from "../lib/entry-identity";

type InitialResult = {
  source: "memory" | "spotlight" | "waiting";
  path?: string;
  memoryPending?: boolean;
};

/** Choose an initial result once per query; preserve explicit parent-folder focus. */
export function useFolderSelection(
  initialPath: string | undefined,
  rows: { entry: Entry }[],
  generation: number,
  query: string,
  restorationRevision = 0,
  selectFirst = false,
  initialResult: InitialResult = { source: "memory" },
) {
  const firstFocus = useRef<{ id: string; userSelected: boolean } | undefined>(
    undefined,
  );
  const [request, setRequest] = useState({
    revision: restorationRevision,
    query,
    path: initialPath,
    retainedPath: initialPath,
    chosenPath: undefined as string | undefined,
    committed: false,
    pending: true,
    ready: false,
  });
  const selection = useRef<{ query: string; path?: string } | undefined>(
    undefined,
  );
  if (request.revision !== restorationRevision || request.query !== query) {
    const restoring = request.revision !== restorationRevision;
    firstFocus.current = undefined;
    selection.current = undefined;
    setRequest({
      revision: restorationRevision,
      query,
      path: restoring ? initialPath : undefined,
      retainedPath: restoring ? initialPath : undefined,
      chosenPath: undefined,
      committed: false,
      pending: restoring || selectFirst,
      ready: false,
    });
  }
  // A source's "done" flag can arrive one render before its ranked rows.
  // Keep updating the staged candidate until its focus request is actually sent.
  const targetPath =
    request.path ??
    (request.committed ? request.chosenPath : undefined) ??
    initialResult.path;
  const target =
    query === request.query &&
    request.pending &&
    initialResult.source !== "waiting"
      ? targetPath
        ? rows.find(({ entry }) => entry.path === targetPath)
        : selectFirst
          ? rows[0]
          : undefined
      : undefined;
  const targetId = target ? rowIdForEntry(generation, target.entry) : undefined;
  const followFirst =
    request.pending && query === request.query && !request.path && selectFirst;

  // Read the latest committed target at the deadline without restarting the
  // timer for every Spotlight batch. Effects also ensure rows publish first.
  const latestTarget = useRef<string | undefined>(undefined);
  useEffect(() => {
    latestTarget.current = target?.entry.path;
  }, [target?.entry.path]);
  const hasTarget = target !== undefined;
  const lostTarget =
    request.pending &&
    !!request.chosenPath &&
    !request.path &&
    initialResult.source !== "waiting" &&
    !hasTarget;
  useEffect(() => {
    if (lostTarget) {
      firstFocus.current = undefined;
      setRequest((current) => ({
        ...current,
        chosenPath: undefined,
        committed: false,
        ready: false,
      }));
    }
  }, [lostTarget]);
  const delay =
    !request.path &&
    !request.chosenPath &&
    (initialResult.source === "spotlight" || initialResult.memoryPending)
      ? 200
      : 0;
  useEffect(() => {
    if (!hasTarget || request.ready) return;
    const choose = () => {
      const path = latestTarget.current;
      if (!path) return;
      setRequest((current) =>
        current.query === query &&
        current.revision === restorationRevision &&
        current.pending &&
        !current.ready
          ? // Publish the chosen target (including offscreen rows) in one commit,
            // then request its native selection in the following commit.
            {
              ...current,
              chosenPath: path,
              ready: current.chosenPath === path,
              committed: current.committed || current.chosenPath === path,
            }
          : current,
      );
    };
    if (delay === 0) {
      choose();
      return;
    }
    const timer = setTimeout(choose, delay);
    return () => clearTimeout(timer);
  }, [
    hasTarget,
    request.ready,
    request.chosenPath,
    query,
    restorationRevision,
    delay,
  ]);

  return {
    // Do not echo native selections after the user takes control.
    selectedId: request.ready ? (targetId ?? null) : null,
    retainedPath:
      query === request.query && request.pending
        ? (request.chosenPath ?? request.retainedPath)
        : undefined,
    getSelectedPath: () =>
      followFirst && request.chosenPath && !firstFocus.current?.userSelected
        ? target?.entry.path
        : selection.current?.query === query
          ? selection.current.path
          : target?.entry.path,
    onSelectionChange: (id: string | null) => {
      const entry = rows.find(
        ({ entry }) => rowIdForEntry(generation, entry) === id,
      )?.entry;
      if (id !== null && !entry) return;
      const previousPath =
        selection.current?.query === query ? selection.current.path : undefined;
      selection.current = { query, path: entry?.path };
      if (id === null) {
        firstFocus.current = undefined;
        setRequest({
          revision: restorationRevision,
          query,
          path: request.pending ? request.path : undefined,
          retainedPath: request.pending ? request.retainedPath : undefined,
          chosenPath: undefined,
          committed: false,
          pending: true,
          ready: false,
        });
        return;
      }
      if (followFirst) {
        // The first native report may restore an old highlight. A subsequent
        // move during the settling interval is user navigation: do not steal it.
        if (
          !request.ready &&
          !request.chosenPath &&
          previousPath &&
          entry?.path !== previousPath
        ) {
          setRequest({ ...request, pending: false });
          return;
        }
        if (entry && id !== null && id === targetId) {
          firstFocus.current = { id, userSelected: false };
        } else if (
          entry &&
          firstFocus.current &&
          firstFocus.current.id === targetId &&
          id !== targetId
        ) {
          firstFocus.current.userSelected = true;
          setRequest({ ...request, pending: false });
        } else if (entry && request.ready) {
          // Rearm an unacknowledged request without changing its chosen path.
          setRequest({ ...request, ready: false });
        }
      } else if (targetId && id === targetId)
        setRequest({ ...request, pending: false });
      else if (targetId && request.ready)
        setRequest({ ...request, ready: false });
    },
  };
}
