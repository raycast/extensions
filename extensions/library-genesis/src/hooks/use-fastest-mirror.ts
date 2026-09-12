import { useEffect } from "react";
import useSWR from "swr";

import { LocalStorage } from "@raycast/api";

import { mirror } from "@/utils/api/mirrors";

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
      const now = Date.now();

      if (!fastestMirror || !lastUpdate || now - lastUpdate > 3600000) {
        const fastest = await mirror(abortController.signal);
        if (fastest) {
          setFastestMirrorState({
            fastestMirror: fastest,
            lastUpdate: Date.now(),
          });
          await LocalStorage.setItem("fastest-mirror", fastest);
          await LocalStorage.setItem("last-update", Date.now());
        }
      } else {
        setFastestMirrorState({
          fastestMirror,
          lastUpdate,
        });
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
