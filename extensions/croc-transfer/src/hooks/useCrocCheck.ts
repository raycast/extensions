import { useState, useEffect } from "react";
import {
  clearCrocPathCache,
  getCrocVersionAsync,
  resolveCrocPathAsync,
} from "../utils/croc";

interface CrocCheckResult {
  isChecking: boolean;
  crocPath: string | null;
  version: string | null;
  isInstalled: boolean;
  recheck: () => void;
}

export function useCrocCheck(): CrocCheckResult {
  const [isChecking, setIsChecking] = useState(true);
  const [crocPath, setCrocPath] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsChecking(true);
    (async () => {
      const path = await resolveCrocPathAsync();
      if (cancelled) return;
      setCrocPath(path);
      if (path) setVersion(await getCrocVersionAsync(path));
      setIsChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const recheck = () => {
    clearCrocPathCache();
    setTick((t) => t + 1);
  };

  return {
    isChecking,
    crocPath,
    version,
    isInstalled: crocPath !== null,
    recheck,
  };
}
