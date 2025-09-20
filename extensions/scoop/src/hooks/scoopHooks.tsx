import { useEffect, useState } from "react";
import { ScoopManager } from "../scoop";
import { ScoopPackage, InstalledScoopPackage } from "../types/index.types";

function useScoop() {
  const [scoop, setScoop] = useState<ScoopManager>(ScoopManager.getInstance());

  useEffect(() => {
    const scoopManager = ScoopManager.getInstance();
    setScoop(scoopManager);
  }, []);

  return scoop;
}

export { useScoop };
