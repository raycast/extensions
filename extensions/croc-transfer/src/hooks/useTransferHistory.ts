import { useState, useEffect, useCallback } from "react";
import {
  TransferRecord,
  loadHistory,
  deleteRecord,
  clearHistory,
} from "../utils/history";

export function useTransferHistory() {
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const records = await loadHistory();
    setHistory(records);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteRecord(id);
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clear = useCallback(async () => {
    await clearHistory();
    setHistory([]);
  }, []);

  return { history, isLoading, refresh, remove, clear };
}
