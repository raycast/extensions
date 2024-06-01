import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef } from "react";

import { getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { useSelectionSetting } from "@/hooks/use-settings";

const useOptionalSelection = (setContent: Dispatch<SetStateAction<string>>) => {
  const enabled = useSelectionSetting();
  const dataIsAlreadySet = useRef(false);
  const { isLoading, data, error } = usePromise(async () => {
    return await getSelectedText();
  });

  useEffect(() => {
    if (data && !error && !isLoading && !dataIsAlreadySet.current) {
      dataIsAlreadySet.current = true;
      if (!enabled) {
        return;
      }
      const trimmed = data.trim();
      if (trimmed && trimmed.length > 0) {
        setContent(trimmed);
      }
    }
  }, [data, error, isLoading, setContent, enabled]);
};

export default useOptionalSelection;
