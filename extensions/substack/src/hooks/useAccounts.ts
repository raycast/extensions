import { useCallback, useEffect, useState } from "react";

import { type AccountSummary, defaultAccountId, listAccounts } from "@/lib/accounts";

export default function useAccounts() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listAccounts();
      const defaultId = await defaultAccountId();
      setAccounts(list);
      setSelectedId((previous) =>
        list.some((a) => a.id === previous) ? previous : (defaultId ?? (list.length === 1 ? list[0].id : "")),
      );
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load Substack accounts.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { accounts, selectedId, setSelectedId, isLoading, error, reload };
}
