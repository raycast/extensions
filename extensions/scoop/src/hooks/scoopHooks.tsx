import { useEffect, useState } from "react";
import { ScoopManager } from "../scoop";

function useScoop() {
  const [scoop, setScoop] = useState<ScoopManager>(ScoopManager.getInstance());

  useEffect(() => {
    const scoopManager = ScoopManager.getInstance();
    setScoop(scoopManager);
  }, []);

  return scoop;
}

export { useScoop };
