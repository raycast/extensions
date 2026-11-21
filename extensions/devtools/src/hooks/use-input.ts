import { Clipboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";

export function useInput(initial: string | undefined, acceptClipboard: (text: string) => boolean = () => true) {
  const [value, updateValue] = useState(initial ?? "");
  const edited = useRef(false);
  const { isLoading } = usePromise(Clipboard.readText, [], {
    execute: !initial,
    onData: (text) => {
      if (!edited.current && text && acceptClipboard(text)) updateValue(text);
    },
    onError: () => {
      // Clipboard access is optional; manual input remains available.
    },
  });

  function setValue(text: string) {
    edited.current = true;
    updateValue(text);
  }

  return { value, setValue, isLoading };
}
