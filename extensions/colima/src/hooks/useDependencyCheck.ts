import { useEffect, useState } from "react";
import { checkColima, checkDocker } from "../utils/cli";

interface DependencyStatus {
  colimaAvailable: boolean;
  dockerAvailable: boolean;
  isChecking: boolean;
}

export function useDependencyCheck(requirements: { colima?: boolean; docker?: boolean } = {}) {
  const [status, setStatus] = useState<DependencyStatus>({
    colimaAvailable: true,
    dockerAvailable: true,
    isChecking: true,
  });

  useEffect(() => {
    async function check() {
      const results: DependencyStatus = {
        colimaAvailable: true,
        dockerAvailable: true,
        isChecking: false,
      };

      if (requirements.colima) {
        results.colimaAvailable = await checkColima();
      }
      if (requirements.docker) {
        results.dockerAvailable = await checkDocker();
      }

      setStatus(results);
    }
    check();
  }, []);

  return status;
}
