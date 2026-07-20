import { useEffect, useState } from "react";

const toError = (error: unknown): Error => {
  return error instanceof Error ? error : new Error("Something went wrong");
};

export const useAccount = <T>(apiFn: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiFn();
        if (isActive) {
          setData(response);
        }
      } catch (error) {
        if (isActive) {
          setData(null);
          setError(toError(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isActive = false;
    };
  }, [apiFn]);

  return { data, isLoading, error };
};
