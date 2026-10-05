import { Clipboard, Detail, getSelectedText } from "@raycast/api";
import { useEffect, useState } from "react";
import { CaptureFlow, type CaptureDraft } from "./components/capture-flow";
import { getConnection, type SynapConnection } from "./utils/preferences";

export default function QuickCapture() {
  const [connection, setConnection] = useState<SynapConnection | null | undefined>(undefined);
  const [draft, setDraft] = useState<CaptureDraft | null>(null);

  useEffect(() => {
    void (async () => {
      const resolved = await getConnection();
      setConnection(resolved);
      if (!resolved) return;

      let text = "";
      try {
        text = await getSelectedText();
      } catch {
        // No selected text is normal; use the clipboard next.
      }
      if (!text) text = (await Clipboard.readText()) ?? "";
      setDraft({
        text: text.trim(),
        sourceLabel: "Selected text or clipboard",
        placeholder: "Paste a thought, note, link, or anything worth keeping…",
      });
    })();
  }, []);

  if (connection === undefined) return <Detail isLoading markdown="" />;
  if (!connection)
    return (
      <Detail markdown="# Connect Synap first\n\nRun **Connect to Synap Pod**, then capture anything without deciding where it belongs." />
    );
  if (!draft) return <Detail isLoading markdown="" />;
  return <CaptureFlow connection={connection} draft={draft} />;
}
