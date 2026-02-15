import { openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { TextToFileForm } from "./components/TextToFileForm";
import { readClipboardTextAtOffset } from "./lib/clipboard";
import { getResolvedPreferences } from "./lib/preferences";

export default function Command() {
  const preferences = getResolvedPreferences();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [text, setText] = useState<string>("");

  useEffect(() => {
    const loadClipboard = async () => {
      setIsLoading(true);

      try {
        const clipboardText = await readClipboardTextAtOffset(
          preferences.defaultClipboardOffset,
        );
        setText(clipboardText);
      } catch (error) {
        setText("");
        const message =
          error instanceof Error ? error.message : "Unable to read clipboard.";
        await showToast({
          style: Toast.Style.Failure,
          title: "Clipboard read failed",
          message,
          primaryAction: {
            title: "Open Extension Preferences",
            onAction: () => {
              void openExtensionPreferences();
            },
          },
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadClipboard();
  }, [preferences.defaultClipboardOffset]);

  return (
    <TextToFileForm
      navigationTitle="Append Text to File"
      initialText={text}
      isLoading={isLoading}
    />
  );
}
