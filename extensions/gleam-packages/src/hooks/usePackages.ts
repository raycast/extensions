import { useEffect, useState } from "react";
import * as cache from "../cache";
import { getPackages, refreshPackages } from "../db";
import { Package } from "../types";

const maxStalenessInMs = 86_400_000; // 24 hours in milliseconds

export default function usePackages() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Package[]>([]);
  const [error, setError] = useState<string>();
  const [date, setDate] = useState<Date>();
  const refresh = async () => {
    setIsLoading(true);
    await refreshPackages();
    setDate(new Date());
  };

  useEffect(() => {
    async function fetchData() {
      try {
        await ensureFreshness();
        const packages = await getPackages();
        setData(packages);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown Error");
        setIsLoading(false);
      }
    }
    fetchData();
  }, [date]);

  return { isLoading, data, error, refresh };
}

async function ensureFreshness() {
  if (!shouldRefresh()) {
    return;
  }
  await refreshPackages();
}

function shouldRefresh(): boolean {
  const lastRefreshAt = cache.getLastRefreshAt();
  if (!lastRefreshAt) {
    return true;
  }
  return new Date().getTime() - lastRefreshAt.getTime() > maxStalenessInMs;
}
