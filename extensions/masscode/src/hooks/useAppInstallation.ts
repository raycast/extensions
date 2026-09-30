import { useEffect, useState } from "react";
import { checkMassCodeInstallation } from "../utils";

export function useAppInstallation(skipCheck: boolean = false) {
  const [isInstalled, setIsInstalled] = useState<boolean | undefined>(skipCheck ? true : undefined);

  useEffect(() => {
    if (skipCheck) return;

    async function checkInstallation() {
      const installed = await checkMassCodeInstallation();
      setIsInstalled(installed);
    }
    checkInstallation();
  }, [skipCheck]);

  return isInstalled;
}
