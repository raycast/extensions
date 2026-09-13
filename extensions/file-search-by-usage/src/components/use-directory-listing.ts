import { useEffect, useState } from "react";
import { DirectorySnapshot, observeDirectory } from "../lib/directory-listing";

const EMPTY: DirectorySnapshot = { entries: [], truncated: 0, pending: false };
const LOADING: DirectorySnapshot = { ...EMPTY, pending: true };

/** Filename-prefix changes reuse the same directory subscription. */
export function useDirectoryListing(
  dir: string | undefined,
  showHidden: boolean,
  reloadKey: number,
  signal?: AbortSignal,
  enabled = true,
): DirectorySnapshot {
  const [state, setState] = useState<{
    dir: string;
    showHidden: boolean;
    reloadKey: number;
    snapshot: DirectorySnapshot;
  }>();
  useEffect(() => {
    if (dir === undefined || !enabled || signal?.aborted) return;
    const stop = observeDirectory(
      dir,
      showHidden,
      (snapshot) => {
        if (signal?.aborted) return;
        setState({ dir, showHidden, reloadKey, snapshot });
      },
      { continuous: true },
    );
    signal?.addEventListener("abort", stop, { once: true });
    return () => {
      signal?.removeEventListener("abort", stop);
      stop();
    };
  }, [dir, showHidden, reloadKey, signal, enabled]);
  if (dir === undefined) return EMPTY;
  return state?.dir === dir &&
    state.showHidden === showHidden &&
    state.reloadKey === reloadKey
    ? state.snapshot
    : LOADING;
}
