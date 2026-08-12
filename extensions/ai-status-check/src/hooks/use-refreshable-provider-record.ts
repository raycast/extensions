import { useCallback, useEffect, useState } from "react";
import type { ProviderStatusRecord } from "../domain/types";

export type RefreshProvider = (providerId: string) => Promise<ProviderStatusRecord>;

export function useRefreshableProviderRecord(
  providerId: string,
  record: ProviderStatusRecord,
  refreshProvider: RefreshProvider,
) {
  const [currentRecord, setCurrentRecord] = useState(record);
  useEffect(() => setCurrentRecord(record), [record]);

  const refresh = useCallback(async () => {
    setCurrentRecord((current) => ({ ...current, refreshState: "refreshing", refreshError: undefined }));
    const result = await refreshProvider(providerId);
    setCurrentRecord(result);
  }, [providerId, refreshProvider]);

  return { record: currentRecord, refresh };
}
