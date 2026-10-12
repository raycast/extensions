import { useEffect } from "react";
import useSWR from "swr";

import { LocalStorage } from "@raycast/api";

import { getValidatedMirror } from "@/utils/api/mirrors";

const useFastestMirror = () => {
  const { data: fastestMirror, mutate: setFastestMirror } = useSWR<string>("fastest-mirror");

  useEffect(() => {
    const abortController = new AbortController();

    (async () => {
      const savedMirror = await LocalStorage.getItem<string>("fastest-mirror");
      const lastUpdate = await LocalStorage.getItem<number>("last-update");
      if (abortController.signal.aborted) return;
      const now = Date.now();

      const cachedMirror = savedMirror && lastUpdate && now - lastUpdate <= 3600000 ? savedMirror : undefined;
      const fastest = await getValidatedMirror(cachedMirror, abortController.signal);
      if (abortController.signal.aborted) return;

      if (fastest) {
        const updatedAt = fastest === cachedMirror ? lastUpdate! : Date.now();
        setFastestMirror(fastest);
        await LocalStorage.setItem("fastest-mirror", fastest);
        await LocalStorage.setItem("last-update", updatedAt);
      } else {
        setFastestMirror(undefined);
        await LocalStorage.removeItem("fastest-mirror");
        await LocalStorage.removeItem("last-update");
      }
    })();

    return () => {
      abortController.abort();
    };
  }, []);

  return {
    mirror: fastestMirror,
  };
};

export default useFastestMirror;
