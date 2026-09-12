import { Action, ActionPanel, Clipboard, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { runAugeBarcode } from "./api/auge";
import { AugeGuard } from "./components/AugeGuard";
import { getFinderSelection } from "./utils/finder";

export default function Command() {
  return (
    <AugeGuard checkForFileSystemPermission>
      <OcrQr />
    </AugeGuard>
  );
}

function OcrQr() {
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function readFromSource(source: "clipboard" | "file") {
    setIsLoading(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Reading QR / barcode…" });

      let text: string;

      if (source === "clipboard") {
        text = await runAugeBarcode({ type: "clipboard" });
      } else {
        const path = await getFinderSelection();
        if (!path) {
          await showToast({ style: Toast.Style.Failure, title: "No file selected in Finder" });
          return;
        }
        text = await runAugeBarcode({ type: "file", path: path });
      }

      if (!text) {
        await showToast({ style: Toast.Style.Failure, title: "No QR code or barcode found" });
        return;
      }

      await Clipboard.copy(text);
      await showToast({ style: Toast.Style.Success, title: "Result copied to clipboard!" });
      setResult(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
    }
  }

  if (result) {
    const isUrl = result.startsWith("http://") || result.startsWith("https://");
    return (
      <Detail
        markdown={`# QR / Barcode Result\n\n\`\`\`\n${result}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Again" content={result} />
            {isUrl && <Action.OpenInBrowser title="Open URL" url={result} />}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="Read from Clipboard"
        subtitle="Use image currently in clipboard"
        icon={Icon.Clipboard}
        actions={
          <ActionPanel>
            <Action title="Read from Clipboard" onAction={() => readFromSource("clipboard")} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Read from File"
        subtitle="Use file selected in Finder"
        icon={Icon.Document}
        actions={
          <ActionPanel>
            <Action title="Read from File" onAction={() => readFromSource("file")} />
          </ActionPanel>
        }
      />
    </List>
  );
}
