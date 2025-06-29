import { useCachedPromise } from "@raycast/utils";
import getVolumeTool from "../tools/get-volume";
import setVolumeTool from "../tools/set-volume";
import { useCallback, useEffect, useState } from "react";

export function useVolume() {
  const [volume, _setVolume] = useState(0);
  const { data, revalidate } = useCachedPromise(getVolumeTool, []);

  useEffect(() => {
    if (data) {
      _setVolume(data);
    }
  }, [data]);

  const setVolume = useCallback(
    async (volume: number) => {
      await setVolumeTool(volume);
      revalidate();
      _setVolume(volume);
    },
    [revalidate],
  );

  return { volume, setVolume };
}
