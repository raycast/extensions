import { Action, ActionPanel, Clipboard, Detail, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { reflowPreviewMarkdown } from "./lib/preview-source";
import { reflowOutcome } from "./lib/reflow-outcome";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const text = (await Clipboard.readText())?.trim() ?? "";
      if (cancelled) return;

      const outcome = reflowOutcome(text || null);
      switch (outcome.status) {
        case "empty":
          setMessage("Copy hard-wrapped markdown first, then run Reflow Markdown.");
          break;
        case "not-markdown":
          setMessage("No markdown to reflow. Need a heading or at least two list items.");
          break;
        case "already-clean":
        case "reflowed":
          setResult(outcome.text);
          setPreview(reflowPreviewMarkdown(outcome.original, outcome.text));
          break;
      }
      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={preview ?? (message ? `*${message}*` : undefined)}
      actions={
        result ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={result}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.Paste title="Paste in Active App" content={result} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
