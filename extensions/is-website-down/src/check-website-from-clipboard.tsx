import { Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { WebsiteStatusDetail } from "./components/WebsiteStatusDetail";

export default function Command() {
  const [clipboardText, setClipboardText] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isCancelled = false;

    async function readClipboard() {
      try {
        const text = await Clipboard.readText();
        const nextText = text?.trim();

        if (!nextText) {
          throw new Error("Clipboard does not contain a website URL.");
        }

        if (!isCancelled) {
          setClipboardText(nextText);
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Could not read clipboard text.";

        if (!isCancelled) {
          setError(message);
          showToast({
            style: Toast.Style.Failure,
            title: "No website URL found",
            message,
          });
        }
      }
    }

    readClipboard();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (clipboardText) {
    return <WebsiteStatusDetail input={clipboardText} />;
  }

  if (error) {
    return (
      <List navigationTitle="Check Website from Clipboard">
        <List.EmptyView
          icon={Icon.Clipboard}
          title="Could Not Read Clipboard"
          description={error}
        />
      </List>
    );
  }

  return (
    <List isLoading navigationTitle="Check Website from Clipboard">
      <List.EmptyView title="Reading Clipboard" />
    </List>
  );
}
