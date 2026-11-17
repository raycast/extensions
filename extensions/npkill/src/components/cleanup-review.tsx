import { Action, ActionPanel, Detail, environment, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import { Artifact } from "../types";
import { CleanupResult } from "../services/cleanup";
import { estimatedTotal, formatSize, markdownText } from "../utils/artifacts";
import { reportInfographic, reviewInfographic } from "../utils/infographics";

export function CleanupReview({
  items,
  onConfirm,
}: {
  items: Artifact[];
  onConfirm: () => Promise<CleanupResult[] | undefined>;
}) {
  const [results, setResults] = useState<CleanupResult[]>();
  const [working, setWorking] = useState(false);
  const infographic = useMemo(() => reviewInfographic(items, environment.appearance), [items]);
  if (results) return <CleanupReport results={results} />;
  const markdown = `# Review ${items.length} ${items.length === 1 ? "Directory" : "Directories"}\n\nYou can restore directories from Trash until you empty it.\n\n${infographic}\n\n${items.map((item) => `- **${markdownText(item.path)}** — ${formatSize(item.size)} · ${item.risk}${item.reason ? ` — ${markdownText(item.reason)}` : ""}`).join("\n\n")}\n\nOnly these exact paths will be moved. Each directory is revalidated immediately before cleanup. Active processes may still be using these files.`;
  return (
    <Detail
      navigationTitle="Move to Trash — Review"
      isLoading={working}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Reviewed Paths" content={items.map((item) => item.path).join("\n")} />
          <Action
            title="Confirm Move to Trash"
            style={Action.Style.Destructive}
            icon={Icon.Trash}
            onAction={async () => {
              if (working) return;
              setWorking(true);
              try {
                const report = await onConfirm();
                if (report) setResults(report);
              } finally {
                setWorking(false);
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function CleanupReport({ results }: { results: CleanupResult[] }) {
  const successes = results.filter((result) => result.status === "success");
  const infographic = useMemo(() => reportInfographic(results, environment.appearance), [results]);
  return (
    <Detail
      navigationTitle="Cleanup Report"
      markdown={`# Cleanup Report\n\n${infographic}\n\n${successes.length} moved to Trash · ${results.filter((r) => r.status === "missing").length} already missing · ${results.filter((r) => r.status === "failed").length} failed\n\n${estimatedTotal(successes)} moved to Trash. Empty Trash to reclaim disk space.\n\n${results.map((result) => `- **${markdownText(result.path)}**\n\n  ${result.status === "success" ? "Moved to Trash" : result.status === "missing" ? "Already missing" : "Failed"}${result.error ? ` — ${markdownText(result.error)}` : ""}`).join("\n\n")}`}
    />
  );
}
