import { showToast, List } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

const API_URL = "https://ai-translator-iota.vercel.app/api/chat";

export default function Command() {
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Debounce the input: trigger translation 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (word.trim() !== "") {
        handleTranslate();
      } else {
        setTranslation("");
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [word]);

  const handleTranslate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: word }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      const translationText = await response.text();
      let formattedTranslation = translationText.replace(/\\n/g, "\n");
      if (formattedTranslation.startsWith('"') && formattedTranslation.endsWith('"')) {
        formattedTranslation = formattedTranslation.slice(1, -1);
      }
      setTranslation(formattedTranslation);
      showToast({ title: "Success", message: "Translation fetched successfully!" });
    } catch (error) {
      showToast({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to fetch translation",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setWord}
      searchBarPlaceholder="Enter a word or select text..."
      throttle
      isShowingDetail={true} // This ensures the detail panel is always visible.
    >
      <List.Item
        title={word || "No input provided"}
        detail={<List.Item.Detail markdown={translation || "Enter a word to translate."} />}
      />
    </List>
  );
}
