import { useCallback, useEffect, useState } from "react";
import type { ProviderStatusRecord } from "../domain/types";

export type RefreshProvider = (providerId: string) => Promise<ProviderStatusRecord | undefined>;

export function useRefreshableProviderRecord(
  providerId: string,
  record: ProviderStatusRecord,
  refreshProvider: RefreshProvider,
) {
  const [currentRecord, setCurrentRecord] = useState(record);
  useEffect(() => setCurrentRecord(record), [record]);

  const refresh = useCallback(async () => {
    setCurrentRecord((current) => ({ ...current, refreshState: "refreshing", refreshError: undefined }));
    try {
      const result = await refreshProvider(providerId);
      setCurrentRecord((current) => result ?? { ...current, refreshState: "idle" });
    } catch (error) {
      setCurrentRecord((current) => ({
        ...current,
        refreshState: "failed",
        refreshError: error instanceof Error && error.message ? error.message : "Could not refresh provider status",
      }));
    }
  }, [providerId, refreshProvider]);

  return { record: currentRecord, refresh };
}
