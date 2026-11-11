import { useEffect, useState } from "react";
import { discoverSharedCloudFolders } from "../lib/shared-cloud-folders";
import { Entry } from "../lib/types";

/** Bounded Google Drive shared-folder targets for an unscoped search. */
export function useSharedCloudFolders(
  dir: string | undefined,
  reloadKey: number,
): Entry[] {
  const [sharedFolders, setSharedFolders] = useState<Entry[]>([]);
  useEffect(() => {
    setSharedFolders([]);
    if (dir) return; // only an unscoped search offers these as candidates
    const active = new AbortController();
    void discoverSharedCloudFolders(active.signal).then((found) => {
      if (!active.signal.aborted) setSharedFolders(found);
    });
    return () => active.abort();
  }, [dir, reloadKey]);
  return sharedFolders;
}
