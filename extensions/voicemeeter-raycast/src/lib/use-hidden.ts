import { useCallback, useEffect, useState } from "react";
import { loadHidden, toggleHidden as toggleHiddenStorage } from "./hidden";
import { VoicemeeterTarget } from "./types";

export function useHidden() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const next = await loadHidden();
    setHidden(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleHidden = useCallback(async (target: VoicemeeterTarget) => {
    const isNowHidden = await toggleHiddenStorage(target);
    setHidden((prev) => {
      const key = `${target.kind}:index:${target.index}`;
      const next = new Set(prev);
      if (isNowHidden) next.add(key);
      else next.delete(key);
      return next;
    });
    return isNowHidden;
  }, []);

  return { hidden, toggleHidden, refresh };
}
