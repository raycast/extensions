import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef } from "react";

import { getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { useSelectionSetting } from "@/hooks/use-settings";

const useOptionalSelection = (setContent: Dispatch<SetStateAction<string>>, disabled: boolean) => {
  const enabled = useSelectionSetting() && !disabled;
  const dataIsAlreadySet = useRef(false);
  const { isLoading, data } = usePromise(
    async () => {
      try {
        return await getSelectedText();
      } catch {
        return "";
      }
    },
    [],
    { execute: enabled },
  );

  useEffect(() => {
    if (data && !isLoading && !dataIsAlreadySet.current) {
      dataIsAlreadySet.current = true;
      const trimmed = data.trim();
      if (trimmed && trimmed.length > 0) {
        setContent(trimmed);
      }
    }
  }, [data, isLoading, setContent]);
};

export default useOptionalSelection;
