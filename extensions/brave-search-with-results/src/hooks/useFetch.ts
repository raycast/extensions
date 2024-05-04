import { useEffect, useState } from "react";
import fetch, { RequestInit } from "node-fetch";

export default function useFetch<DataType>(url: URL, options: RequestInit, execute: boolean) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<undefined | DataType>();

  useEffect(() => {
    if (execute === false) {
      setIsLoading(false);
      setData(undefined);
      return;
    }

    const controller = new AbortController();

    setIsLoading(true);

    fetch(url, {
      ...options,
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok === false) {
          throw new Error(`API returned with status ${response.status}`);
        }

        return response;
      })
      .then((response) => response.json())
      .then((data) => {
        setIsLoading(false);
        setData(data as DataType);
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          // Do nothing as another fetch is already in progress
          return;
        }

        setIsLoading(false);
        setData(undefined);

        throw error;
      });

    return () => {
      controller.abort();
    };
  }, [url.href, options.headers, setData, setIsLoading, execute]);

  return {
    isLoading,
    data,
  };
}
