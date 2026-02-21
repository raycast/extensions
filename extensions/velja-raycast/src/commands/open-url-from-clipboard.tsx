import { Clipboard, Detail, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { normalizeUrl, openUrlWithVelja } from "../lib/url-actions";

export default function Command() {
  const [markdown, setMarkdown] = useState("# Open URL from Clipboard\n\nReading clipboard...");

  useEffect(() => {
    async function run() {
      try {
        const clipboardText = await Clipboard.readText();

        if (!clipboardText || !clipboardText.trim()) {
          throw new Error("Clipboard does not contain text");
        }

        const normalizedUrl = normalizeUrl(clipboardText);
        openUrlWithVelja(normalizedUrl);

        setMarkdown(`# Open URL from Clipboard

Opened: \`${normalizedUrl}\``);
        await showToast({ style: Toast.Style.Success, title: "Opened clipboard URL" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setMarkdown(`# Open URL from Clipboard

Could not open clipboard content.

Error: ${message}`);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not open clipboard URL",
          message,
        });
      }
    }

    run();
  }, []);

  return <Detail markdown={markdown} />;
}
