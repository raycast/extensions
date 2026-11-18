import { Clipboard } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

export function useInput(initial: string | undefined, acceptClipboard: (text: string) => boolean = () => true) {
  const [value, updateValue] = useState(initial ?? "");
  const [isLoading, setIsLoading] = useState(!initial);
  const edited = useRef(false);

  function setValue(text: string) {
    edited.current = true;
    updateValue(text);
  }

  useEffect(() => {
    if (initial) return;
    let active = true;
    Clipboard.readText()
      .then((text) => {
        if (active && !edited.current && text && acceptClipboard(text)) updateValue(text);
      })
      .catch(() => {
        // Manual input remains available when the clipboard can't be read.
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // Clipboard is only read at launch, so a late result never replaces user input.
  }, []);

  return { value, setValue, isLoading };
}
