import { Clipboard, showToast, Toast, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { ActionList } from "./components/ActionList";
import { detectContent } from "./detection";
import { ContentResult } from "./detection/types";

export default function SmartPaste() {
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState<string>("");
  const [detection, setDetection] = useState<ContentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastClipboard, setLastClipboard] = useState<string>("");

  useEffect(() => {
    let isCancelled = false;

    async function loadClipboard() {
      try {
        const clipboardText = await Clipboard.readText();
        const newClipboard = clipboardText || "";

        if (isCancelled) return;

        // Only update if clipboard content changed
        if (newClipboard === lastClipboard) {
          return;
        }

        setIsLoading(true);
        setError(null);
        setLastClipboard(newClipboard);

        if (isCancelled) return;

        if (!clipboardText) {
          if (isCancelled) return;

          setError("Clipboard is empty");
          await showToast({
            style: Toast.Style.Failure,
            title: "Nothing to process",
            message: "Clipboard is empty",
          });
          setIsLoading(false);
          return;
        }

        if (isCancelled) return;

        setText(clipboardText);
        const result = await detectContent(clipboardText);

        if (isCancelled) return;

        setDetection(result);
        setIsLoading(false);
      } catch {
        if (isCancelled) return;

        setError("Failed to read clipboard");
        setIsLoading(false);
      }
    }

    // Load clipboard only when component mounts (when user opens Raycast)
    loadClipboard();

    return () => {
      isCancelled = true;
    };
  }, [lastClipboard]);

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

  return <ActionList text={text} detection={detection} source="clipboard" />;
}
