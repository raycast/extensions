import { useEffect, useState } from "react";
import { getStatus, StatusData } from "../apple-music";

export const useStatus = () => {
  const [data, setData] = useState<StatusData>();
  const [revalidate, setRevalidate] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setData(await getStatus());
      setIsLoading(false);
    })();
  }, [revalidate]);

  return { data, revalidate: () => setRevalidate(Date.now()), isLoading };
};
