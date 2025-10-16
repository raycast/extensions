import { useEffect, useState } from "react";
import fetch from "cross-fetch";

export const useFetch = (url: string | undefined, init: RequestInit) => {
  const [data, setData] = useState<unknown | undefined>(undefined);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(undefined);

    if (url == undefined) return;

    fetch(url, init)
      .then((res) => res.json())
      .then((value) => {
        setLoading(false);
        setData(value);
      });
  }, [url]);

  return { data, isLoading };
};
