import { useCallback, useEffect, useState } from "react";
import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { Stats } from "./interfaces";

const useStats = (): Stats => {
  const [accessCounts, setAccessCounts] = useState<{ [name: string]: number }>({});
  const [accessTimes, setAccessTimes] = useState<{ [name: string]: number | null }>({});

  const increment = useCallback(
    (scriptName: string) => {
      const newAccessCounts = {
        ...(accessCounts || {}),
        [scriptName]: accessCounts[scriptName] ? accessCounts[scriptName] + 1 : 1,
      };
      setLocalStorageItem("access-counts", JSON.stringify(newAccessCounts));
      setAccessCounts(newAccessCounts);
      const newAccessTimes = {
        ...(accessTimes || {}),
        [scriptName]: Date.now(),
      };
      setLocalStorageItem("access-times", JSON.stringify(newAccessTimes));
      setAccessTimes(newAccessTimes);
    },
    [accessCounts, setAccessCounts, accessTimes, setAccessTimes]
  );

  const clear = useCallback(
    (scriptName?: string) => {
      const newAccessCounts = scriptName
        ? {
            ...(accessCounts || {}),
            [scriptName]: 0,
          }
        : {};

      setLocalStorageItem("access-counts", JSON.stringify(newAccessCounts));
      setAccessCounts(newAccessCounts);

      const newAccessTimes = scriptName
        ? {
            ...(accessTimes || {}),
            [scriptName]: null,
          }
        : {};

      setLocalStorageItem("access-times", JSON.stringify(newAccessTimes));
      setAccessTimes(newAccessTimes);
    },
    [accessCounts, setAccessCounts, accessTimes, setAccessTimes]
  );

  useEffect(() => {
    getLocalStorageItem("access-counts").then((data) => {
      try {
        const parsed = JSON.parse(data as string);
        if (!parsed || typeof parsed !== "object") {
          return;
        }
        setAccessCounts(parsed);
      } catch (e) {
        // swallow
      }
    });
    getLocalStorageItem("access-times").then((data) => {
      try {
        const parsed = JSON.parse(data as string);
        if (!parsed || typeof parsed !== "object") {
          return;
        }
        setAccessTimes(parsed);
      } catch (e) {
        // swallow
      }
    });
  }, [setAccessCounts, setAccessTimes]);

  return { accessCounts, accessTimes, increment, clear };
};

export default useStats;
