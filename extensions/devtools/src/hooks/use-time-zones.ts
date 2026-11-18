import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { parseTimeZones } from "../lib/timestamp";
import { DEFAULT_TIME_ZONES, readSavedTimeZones } from "../lib/time-zones";

const storageKey = "timestamp.timeZones";

function initialTimeZones(): string[] {
  // Carry forward the previous text preference when it is still supplied by Raycast.
  const legacy = getPreferenceValues<{ timeZones?: string }>().timeZones;
  if (legacy) {
    try {
      return parseTimeZones(legacy);
    } catch {
      // Invalid old settings should not prevent choosing a valid zone.
    }
  }
  return [...DEFAULT_TIME_ZONES];
}

export function useTimeZones() {
  const [timeZones, setTimeZones] = useState(initialTimeZones);
  const [isLoading, setIsLoading] = useState(true);
  const edited = useRef(false);
  const pendingWrite = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    LocalStorage.getItem<string>(storageKey)
      .then((saved) => {
        if (!active || edited.current || saved === undefined) return;
        const zones = readSavedTimeZones(saved);
        if (zones) setTimeZones(zones);
      })
      .catch(() => {
        // Default zones remain selectable if local storage can't be read.
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function selectTimeZones(zones: string[]) {
    edited.current = true;
    setTimeZones(zones);
    pendingWrite.current = pendingWrite.current
      .then(() => LocalStorage.setItem(storageKey, JSON.stringify(zones)))
      .catch((cause: Error) => {
        void showToast({ style: Toast.Style.Failure, title: "Unable to Save Time Zones", message: cause.message });
      });
  }

  return { timeZones, selectTimeZones, isLoading };
}
