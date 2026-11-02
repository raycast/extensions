import { useCallback, useEffect, useRef, useState } from "react";

import { type AccountSummary, defaultAccountId, listAccounts } from "@/lib/accounts";

export default function useAccounts() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    try {
      const list = await listAccounts();
      const defaultId = await defaultAccountId();
      if (current !== generation.current) return;
      setAccounts(list);
      setSelectedId((previous) =>
        list.some((a) => a.id === previous) ? previous : (defaultId ?? (list.length === 1 ? list[0].id : "")),
      );
      setError(undefined);
    } catch (error) {
      if (current === generation.current)
        setError(error instanceof Error ? error.message : "Could not load Substack accounts.");
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return { accounts, selectedId, setSelectedId, isLoading, error, reload };
}
