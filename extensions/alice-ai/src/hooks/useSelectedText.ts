import { getSelectedText } from "@raycast/api";
import { useEffect, useState } from "react";

export default function useSelectedText() {
  const [selectedText, setSelectedText] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean | undefined>(undefined);

  const refreshSelectedText = async () => {
    setSelectedText("");
    setIsSuccess(undefined);
    try {
      const text = await getSelectedText();

      if (text.trim().length === 0) {
        throw new Error("No text selected");
      }

      setSelectedText(text);
      setIsSuccess(true);
    } catch {
      setSelectedText("");
      setIsSuccess(false);
    }
  };

  useEffect(() => {
    refreshSelectedText();
  }, []);

  return {
    text: selectedText,
    success: isSuccess,
    refresh: refreshSelectedText,
  };
}
