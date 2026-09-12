import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { getCurrentSong } from "../api/radio";
import { type Radio } from "../lib/radioDB";

export function useRadioCurrentSong(radioUrl: Radio["url"] | null) {
  const abortable = useRef<AbortController | null>(null);

  return usePromise(
    async (url: string | null) => {
      return await getCurrentSong(url!, abortable.current?.signal);
    },
    [radioUrl],
    {
      execute: !!radioUrl,
      abortable,
    },
  );
}
