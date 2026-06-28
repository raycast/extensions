import { Action, ActionPanel, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { useToast } from "../utils/useToast";

interface SummaryDisplayProps {
  isLoading: boolean;
  summaryStream?: AsyncGenerator<string, void, unknown>;
  error?: Error;
  onRegenerate: () => void;
  navigationTitle: string;
}

export function SummaryDisplay({
  isLoading,
  summaryStream,
  error,
  onRegenerate,
  navigationTitle,
}: SummaryDisplayProps) {
  const toast = useToast();
  const [finalSummary, setFinalSummary] = useState<string>("");

  useEffect(() => {
    if (!summaryStream) return;

    (async () => {
      try {
        await toast.showLoadingToast("Generating summary…");
        for await (const chunk of summaryStream) {
          setFinalSummary((prev) => prev + chunk);
        }
        await toast.showSuccessToast("Completed", `Summary generated successfully.`);
      } catch (e) {
        toast.showErrorToast("Error processing stream:", e);
        throw e;
      }
    })();
  }, [summaryStream]);

  const markdown = error
    ? `**Error:** Couldn't generate summary.\n\n\`\`${error.message}\`\``
    : finalSummary || "Fetching messages from Slack…";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Summary" content={finalSummary} />
          <Action
            title="Regenerate"
            onAction={() => {
              setFinalSummary("");
              onRegenerate();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
