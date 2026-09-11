import { usePromise } from "@raycast/utils";
import { type UsePromiseReturnType } from "@raycast/utils/dist/types";
import { useRef } from "react";
import { URL } from "url";
import { findByUrl, type Radio } from "../lib/radioDB";

export function useRadio(url: string): UsePromiseReturnType<Radio | string> {
  const abortable = useRef<AbortController | null>(null);

  return usePromise(
    async (url) => {
      return (await findByUrl(url, abortable.current?.signal)) || url;
    },
    [url],
    {
      abortable,
      execute: URL.canParse(url),
    },
  );
}
