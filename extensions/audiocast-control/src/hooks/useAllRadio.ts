import { useRef } from "react";
import { usePromise } from "@raycast/utils";
import { getAll } from "../lib/radioDB";

export function useAllRadio() {
  const abortable = useRef<AbortController | null>(null);

  return usePromise(() => getAll(abortable.current?.signal), [], {
    abortable,
  });
}
