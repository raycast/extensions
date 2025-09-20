import { useState, useEffect } from "react";
import { checkCometInstallation } from "../util";

/**
 * Centralized hook to check Comet installation
 * Caches the result to avoid repeated checks
 */
export function useCometInstallation() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkInstallation = async () => {
      try {
        const installed = await checkCometInstallation();
        if (mounted) {
          setIsInstalled(installed);
          setIsChecking(false);
        }
      } catch (error) {
        if (mounted) {
          setIsInstalled(false);
          setIsChecking(false);
        }
      }
    };

    checkInstallation();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    isInstalled,
    isChecking,
    isReady: !isChecking && isInstalled === true,
  };
}
