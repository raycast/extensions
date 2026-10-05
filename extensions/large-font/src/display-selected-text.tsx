import { getSelectedText, LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { CharacterGrid } from "./character-grid";

type LaunchContext = { text?: string };

/** Receives freshly selected text from the no-view hotkey command. */
export default function DisplaySelectedText({ launchContext = {} }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const [selectedText, setSelectedText] = useState<string | undefined>(launchContext.text);

  useEffect(() => {
    if (launchContext.text !== undefined) return;

    async function fetchSelectedText() {
      try {
        setSelectedText(await getSelectedText());
      } catch (error) {
        setSelectedText("");
        await showToast({
          style: Toast.Style.Failure,
          title: "No selected text available",
          message: "Select text in another app, then invoke Large Font.",
        });
        console.error(error);
      }
    }

    void fetchSelectedText();
  }, [launchContext.text]);

  return <CharacterGrid text={selectedText} />;
}
