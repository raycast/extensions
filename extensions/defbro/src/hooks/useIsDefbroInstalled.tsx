import { useState, useEffect } from "react";
import execPromise from "../utils/execPromise";
import { DEFBRO_PATH } from "../constants";

export function useIsDefbroInstalled() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    const checkInstallation = async () => {
      try {
        await execPromise(`${DEFBRO_PATH} --help`);
        setIsInstalled(true);
      } catch (e) {
        const errorMessage: string = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes("No such file or directory")) {
          setIsInstalled(false);
        }
      }
    };

    checkInstallation();
  }, []);

  return isInstalled;
}
