import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";

export const useFetch = (url: string | undefined, init: RequestInit) => {
  const [data, setData] = useState<unknown | undefined>(undefined);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(undefined);

    if (url === undefined) return;

    fetch(url, init)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((value) => {
        setLoading(false);
        setData(value);
      })
      // Stays loading on failure: dependent requests wait on this one, and an empty view would read as "no data".
      .catch((error) => showFailureToast(error, { title: "Couldn't reach the Helldivers 2 API" }));
  }, [url]);

  return { data, isLoading };
};
