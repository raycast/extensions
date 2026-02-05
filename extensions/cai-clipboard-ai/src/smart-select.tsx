import { getSelectedText, Clipboard, showToast, Toast, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { ActionList } from "./components/ActionList";
import { detectContent } from "./detection";
import { ContentResult } from "./detection/types";

export default function SmartSelect() {
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState<string>("");
  const [detection, setDetection] = useState<ContentResult | null>(null);
  const [source, setSource] = useState<"selection" | "clipboard">("selection");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadText() {
      try {
        // Add a small delay to allow the system to capture the selection
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (isCancelled) return;

        // Try to get selected text first
        try {
          const selectedText = await getSelectedText();

          if (isCancelled) return;

          // Copy the selected text to clipboard for reliability
          await Clipboard.copy(selectedText);

          if (isCancelled) return;

          setText(selectedText);
          setSource("selection");
          const result = await detectContent(selectedText);

          if (isCancelled) return;

          setDetection(result);
          setIsLoading(false);
          return;
        } catch {
          if (isCancelled) return;

          // No selection, try clipboard
          const clipboardText = await Clipboard.readText();
          if (!clipboardText) {
            if (isCancelled) return;

            setError("Select text or copy something first");
            await showToast({
              style: Toast.Style.Failure,
              title: "Nothing to process",
              message: "Select text or copy something first",
            });
            setIsLoading(false);
            return;
          }

          if (isCancelled) return;

          setText(clipboardText);
          setSource("clipboard");
          const result = await detectContent(clipboardText);

          if (isCancelled) return;

          setDetection(result);
          setIsLoading(false);
        }
      } catch {
        if (isCancelled) return;

        setError("Failed to process text");
        setIsLoading(false);
      }
    }

    loadText();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error || !detection) {
    return (
      <List>
        <List.EmptyView title={error || "Failed to process"} />
      </List>
    );
  }

  return <ActionList text={text} detection={detection} source={source} />;
}
