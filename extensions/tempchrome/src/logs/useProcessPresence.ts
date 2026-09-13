import { useEffect, useState } from "react";

import { getChromiumProcessArgs, isProfileInUse } from "../chromium/processes";

export function useProcessPresence(profileDir: string, intervalMs = 2000): boolean {
  const [inUse, setInUse] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check(): Promise<void> {
      const psLines = await getChromiumProcessArgs();
      if (cancelled || psLines === null) {
        // Keep the last known state rather than reporting the browser as closed
        // on a transient `ps` failure.
        return;
      }
      setInUse(isProfileInUse(profileDir, psLines));
    }

    void check();
    const intervalId = setInterval(() => {
      void check();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [profileDir, intervalMs]);

  return inUse;
}
