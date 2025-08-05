import { Cache } from "@raycast/api";
import { UseQuranOptions } from "../types";
import { useEffect, useState } from "react";

const cache = new Cache();

export const useQuran = <T>({ apiFn, cacheKey }: UseQuranOptions<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          setData(JSON.parse(cachedData));
        } else {
          const response = await apiFn();
          setData(response);
          cache.set(cacheKey, JSON.stringify(response));
        }
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setError("Error fetching data");
      }
    };
    fetchData();
  }, []);

  return { data, isLoading, error };
};
