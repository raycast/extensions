import { useCallback, useEffect, useState } from "react";

import type { RimeInstallation } from "../types";
import { getPreferences } from "../lib/preferences";
import { inspectRimeInstallation } from "../lib/rime";

export function useRimeInstallation() {
  const [data, setData] = useState<RimeInstallation>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(true);

  const revalidate = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await inspectRimeInstallation(getPreferences()));
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void revalidate();
  }, [revalidate]);

  return { data, error, isLoading, revalidate };
}
