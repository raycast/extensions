import { useEffect, useState } from "react";
import { getSelectedText, PopToRootType, showHUD } from "@raycast/api";
import LookUpView from "./lib/views/lookup-view";

export default function ThesaurusSelected() {
  const [selectedText, setSelectedText] = useState<string | null>(null);

  useEffect(() => {
    const fetchSelectedText = async () => {
      try {
        const text = await getSelectedText();
        if (text) {
          setSelectedText(text);
        } else {
          showHUD("⚠️ No text selected. Please select a word to look up.", { popToRootType: PopToRootType.Immediate });
        }
      } catch (error) {
        console.error("Error getting selected text:", error);
        showHUD("⚠️ Error getting selected text!", { popToRootType: PopToRootType.Immediate });
      }
    };

    fetchSelectedText();
  }, []);

  if (selectedText && selectedText.trim().length > 0) {
    return <LookUpView selectedWord={selectedText} />;
  }
  return null;
}
