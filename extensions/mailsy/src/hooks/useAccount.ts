import { useEffect, useState } from "react";

export const useAccount = <T>(apiFn: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [isloading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await apiFn();
        setData(response);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setError("Something went wrong");
        setIsLoading(false);
      }
    };
    fetchData();
  }, [apiFn]);

  return { data, isloading, error };
};
