import { useState, useEffect } from "react";
import { getCrocPath, getCrocVersion } from "../utils/croc";

interface CrocCheckResult {
  isChecking: boolean;
  crocPath: string | null;
  version: string | null;
  isInstalled: boolean;
}

export function useCrocCheck(): CrocCheckResult {
  const [isChecking, setIsChecking] = useState(true);
  const [crocPath, setCrocPath] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const path = getCrocPath();
    setCrocPath(path);
    if (path) {
      setVersion(getCrocVersion(path));
    }
    setIsChecking(false);
  }, []);

  return {
    isChecking,
    crocPath,
    version,
    isInstalled: crocPath !== null,
  };
}
