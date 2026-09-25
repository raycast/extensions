import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { FastlyService } from "../types";
import { getServiceVersionDiff } from "../api";

interface ServiceVersionDiffProps {
  service: FastlyService;
  from: number;
  to: number;
}

export function ServiceVersionDiff({ service, from, to }: ServiceVersionDiffProps) {
  const [diff, setDiff] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDiff() {
      try {
        setDiff(await getServiceVersionDiff(service.id, from, to));
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load diff",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadDiff();
  }, []);

  const markdown =
    diff === null
      ? ""
      : diff.trim()
        ? `# Version ${from} → ${to}\n\n\`\`\`diff\n${diff}\n\`\`\``
        : `# Version ${from} → ${to}\n\n_No configuration differences between these versions._`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Diff v${from} → v${to} — ${service.name}`}
      actions={<ActionPanel>{diff ? <Action.CopyToClipboard title="Copy Diff" content={diff} /> : null}</ActionPanel>}
    />
  );
}
