import { useCallback, useEffect, useState } from "react";
import { getHistory, HistoryEntry } from "../utils/history";

export const useProfiles = () => {
  const [profiles, setProfiles] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getHistory_ = useCallback(async () => {
    setIsLoading(true);
    const storedHistory = await getHistory();
    setProfiles(storedHistory);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    getHistory_();
  }, []);

  return { profiles, isLoading, refresh: getHistory_ };
};
