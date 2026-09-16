import { useEffect, useState } from "react";
import { sharedCloudFolders, statEntry } from "../lib/read-dir";
import { Entry } from "../lib/types";

/**
 * Unindexed Drive roots, offered as candidates to an unscoped search.
 *
 * The metadata reads are synchronous, so they are deferred out of the initial
 * render rather than delaying the first useful frame.
 */
export function useSharedCloudFolders(
  dir: string | undefined,
  reloadKey: number,
): Entry[] {
  const [sharedFolders, setSharedFolders] = useState<Entry[]>([]);
  useEffect(() => {
    if (dir) return; // only an unscoped search offers these as candidates
    const timer = setTimeout(() => {
      const found = sharedCloudFolders()
        .map((place) => statEntry(place.path))
        .filter((e): e is Entry => e !== undefined);
      setSharedFolders(found);
    }, 0);
    return () => clearTimeout(timer);
  }, [dir, reloadKey]);
  return sharedFolders;
}
