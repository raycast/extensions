import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

export function useMigratedCachedState<T>(key: string, defaultValue: T) {
  const [state, setState] = useCachedState<T>(key, defaultValue);

  useEffect(() => {
    void (async () => {
      const legacy = await LocalStorage.getItem<string>(key);
      if (!legacy) {
        return;
      }

      try {
        setState(JSON.parse(legacy) as T);
      } catch {
        // Ignore corrupt legacy cache values and fall back to the default state.
      }
      await LocalStorage.removeItem(key);
    })();
  }, [key, setState]);

  return [state, setState] as const;
}
