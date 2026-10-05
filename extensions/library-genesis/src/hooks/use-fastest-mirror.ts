import { useEffect } from "react";
import useSWR from "swr";

import { LocalStorage } from "@raycast/api";

import { getValidatedMirror } from "@/utils/api/mirrors";

type FastestMirrorState = {
  fastestMirror: string;
  lastUpdate: number;
};

const useSharedState = <T>(key: string, initial?: T) => {
  const { data: state, mutate: setState } = useSWR<T>(key, {
    fallbackData: initial,
  });
  return [state, setState] as const;
};

const useFastestMirror = () => {
  const [fastestMirrorState, setFastestMirrorState] = useSharedState<FastestMirrorState>("fastest-mirror");

  useEffect(() => {
    const abortController = new AbortController();

    (async () => {
      const fastestMirror = await LocalStorage.getItem<string>("fastest-mirror");
      const lastUpdate = await LocalStorage.getItem<number>("last-update");
      if (abortController.signal.aborted) return;
      const now = Date.now();

      const cachedMirror = fastestMirror && lastUpdate && now - lastUpdate <= 3600000 ? fastestMirror : undefined;
      const fastest = await getValidatedMirror(cachedMirror, abortController.signal);
      if (abortController.signal.aborted) return;

      if (fastest) {
        const updatedAt = fastest === cachedMirror ? lastUpdate! : Date.now();
        setFastestMirrorState({
          fastestMirror: fastest,
          lastUpdate: updatedAt,
        });
        await LocalStorage.setItem("fastest-mirror", fastest);
        await LocalStorage.setItem("last-update", updatedAt);
      } else {
        setFastestMirrorState(undefined);
        await LocalStorage.removeItem("fastest-mirror");
        await LocalStorage.removeItem("last-update");
      }
    })();

    return () => {
      abortController.abort();
    };
  }, []);

  return {
    mirror: fastestMirrorState?.fastestMirror,
  };
};

export default useFastestMirror;
