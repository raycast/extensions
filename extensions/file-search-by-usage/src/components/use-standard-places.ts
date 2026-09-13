import { useEffect, useMemo, useState } from "react";
import {
  cloudPathCandidates,
  standardPathCandidates,
} from "../lib/starting-paths";
import { useCachedEntries } from "./use-cached-entries";

export function useStandardPlaces(enabled: boolean, reloadKey: number) {
  const standard = useMemo(
    () => (enabled ? standardPathCandidates() : []),
    [enabled],
  );
  const [cloud, setCloud] = useState<{
    paths: { path: string }[];
    partial: boolean;
    pending: boolean;
  }>({ paths: [], partial: false, pending: enabled });
  useEffect(() => {
    const active = new AbortController();
    setCloud({ paths: [], partial: false, pending: enabled });
    if (enabled)
      void cloudPathCandidates(active.signal).then((result) => {
        if (!active.signal.aborted) setCloud({ ...result, pending: false });
      });
    return () => active.abort();
  }, [enabled, reloadKey]);
  const candidates = useMemo(
    () => (enabled ? [...standard, ...cloud.paths] : []),
    [enabled, standard, cloud.paths],
  );
  const checked = useCachedEntries(candidates, "-d", reloadKey, Infinity);
  return {
    entries: checked.entries,
    pending: enabled && (cloud.pending || checked.pending),
    partial: enabled && (cloud.partial || checked.partial),
  };
}
