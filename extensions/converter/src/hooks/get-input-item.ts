import { useCallback, useEffect, useState } from "react";
import { fetchItemInputClipboardFirst, fetchItemInputSelectedFirst } from "../utils/input-item-utils";
import { autoDetect, priorityDetection } from "../types/preferences";

export const getInputItem = () => {
  const [inputItem, setInputItem] = useState<string>("");

  const fetchData = useCallback(async () => {
    if (!autoDetect) {
      return;
    }
    if (priorityDetection === "selected") {
      setInputItem(await fetchItemInputSelectedFirst());
    } else {
      setInputItem(await fetchItemInputClipboardFirst());
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return inputItem.trim();
};
