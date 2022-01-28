import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { useEffect, useState } from "react";
import { isValidStatus, Status } from "../../gitlabapi";
import { getErrorMessage } from "../../utils";

const presetsStoreKey = "presets";

export async function wipePresets() {
  await removeLocalStorageItem(presetsStoreKey);
}

async function storePresets(presets: Status[]) {
  await setLocalStorageItem(presetsStoreKey, JSON.stringify(presets));
}

async function restorePresets(): Promise<Status[] | undefined> {
  const content = await getLocalStorageItem(presetsStoreKey);
  if (content !== undefined) {
    const data = JSON.parse(content.toString());
    if (Array.isArray(data)) {
      const result: Status[] = [];
      for (const d of data) {
        const stat: Status = {
          emoji: d.emoji || "",
          message: d.message || "",
          clear_status_after: d.clear_status_after || "",
        };
        if (isValidStatus(stat)) {
          result.push(stat);
        }
      }
      return result;
    }
  }
  return undefined;
}

export function usePresets(): {
  presets: Status[];
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
  error: string | undefined;
  isLoading: boolean;
} {
  const [presets, setPresets] = useState<Status[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }
      setIsLoading(true);
      try {
        const presets = await restorePresets();
        if (!didUnmount) {
          const data = presets || predefinedPresets();
          await storePresets(data);
          setPresets(data);
        }
      } catch (error) {
        setError(getErrorMessage(error));
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      didUnmount = true;
    };
  }, []);

  return { presets, setPresets, error, isLoading };
}

export function predefinedPresets(): Status[] {
  return [
    {
      emoji: "calendar",
      message: "In a Meeting",
      clear_status_after: "30_minutes",
    },
    {
      emoji: "coffee",
      message: "Coffee break",
      clear_status_after: "30_minutes",
    },
    {
      emoji: "palm_tree",
      message: "Holidays",
      clear_status_after: "7_days",
    },
    {
      emoji: "keyboard",
      message: "AFK",
      clear_status_after: "30_minutes",
    },
    {
      emoji: "hamburger",
      message: "Eating",
      clear_status_after: "30_minutes",
    },
    {
      emoji: "globe_with_meridians",
      message: "Just saving the World",
      clear_status_after: "",
    },
  ];
}
