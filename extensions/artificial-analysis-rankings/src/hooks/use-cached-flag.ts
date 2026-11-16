import { Cache } from "@raycast/api";
import { useCallback, useState } from "react";

const cache = new Cache({ namespace: "interface" });

/** A boolean view preference that persists across command launches. */
export function useCachedFlag(key: string, initial: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    const stored = cache.get(key);
    return stored === undefined ? initial : stored === "true";
  });
  const update = useCallback(
    (next: boolean) => {
      cache.set(key, String(next));
      setValue(next);
    },
    [key],
  );
  return [value, update];
}
