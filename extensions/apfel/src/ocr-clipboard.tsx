import { Action, ActionPanel, Clipboard, Detail, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runAugeOcr } from "./api/auge";
import { AugeGuard } from "./components/AugeGuard";

export default function Command() {
  return (
    <AugeGuard>
      <OcrClipboard />
    </AugeGuard>
  );
}

function OcrClipboard() {
  const { isLoading, data } = usePromise(async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Extracting text from clipboard…" });

    try {
      const text = await runAugeOcr({ type: "clipboard" });

      if (!text) {
        toast.title = "No text found in clipboard image";
        toast.style = Toast.Style.Failure;
        return;
      }

      await Clipboard.copy(text);
      toast.title = "Text copied to clipboard!";
      toast.style = Toast.Style.Success;

      return text;
    } catch (err) {
      toast.title = err instanceof Error ? err.message : String(err);
      toast.style = Toast.Style.Failure;
    }
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ?? ""}
      actions={
        data ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Text" content={data} />
          </ActionPanel>
        ) : null
      }
    />
  );
}
