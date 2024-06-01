import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef } from "react";

import { Clipboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";

const useOptionalClipboard = (setContent: Dispatch<SetStateAction<string>>, enabled: boolean) => {
  const clipboardSet = useRef(false);
  const { isLoading, data } = usePromise(async () => {
    return Clipboard.readText();
  });

  useEffect(() => {
    if (data && !isLoading && !clipboardSet.current) {
      clipboardSet.current = true;
      if (!enabled) {
        return;
      }
      const trimmed = data.trim();
      if (trimmed && trimmed.length > 0) {
        setContent(trimmed);
      }
    }
  }, [data]);
};

export default useOptionalClipboard;
