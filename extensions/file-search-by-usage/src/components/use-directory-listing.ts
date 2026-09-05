import { useEffect, useState } from "react";
import { DirectorySnapshot, observeDirectory } from "../lib/directory-listing";

const EMPTY: DirectorySnapshot = { entries: [], truncated: 0, pending: false };
const LOADING: DirectorySnapshot = { ...EMPTY, pending: true };

/** Filename-prefix changes reuse the same directory subscription. */
export function useDirectoryListing(
  dir: string | undefined,
  showHidden: boolean,
  reloadKey: number,
): DirectorySnapshot {
  const [state, setState] = useState<{
    dir: string;
    showHidden: boolean;
    reloadKey: number;
    snapshot: DirectorySnapshot;
  }>();
  useEffect(() => {
    if (dir === undefined) return;
    return observeDirectory(dir, showHidden, (snapshot) => {
      setState({ dir, showHidden, reloadKey, snapshot });
    });
  }, [dir, showHidden, reloadKey]);
  if (dir === undefined) return EMPTY;
  return state?.dir === dir &&
    state.showHidden === showHidden &&
    state.reloadKey === reloadKey
    ? state.snapshot
    : LOADING;
}
