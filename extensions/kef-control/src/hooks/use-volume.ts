import { showFailureToast, useCachedPromise } from "@raycast/utils";
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
      try {
        await setVolumeTool({ volume });
        _setVolume(volume);
        revalidate();
      } catch {
        showFailureToast(`Failed to set volume to ${volume}`, {
          primaryAction: {
            title: "Retry",
            onAction: () => setVolume(volume),
          },
        });
      }
    },
    [_setVolume, revalidate],
  );

  return { volume, setVolume };
}
