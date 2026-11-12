import { Action, ActionPanel, Detail, environment, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import { Artifact, CleanupMethod } from "../types";
import { CleanupResult } from "../services/cleanup";
import { estimatedTotal, formatSize, markdownText } from "../utils/artifacts";
import { reportInfographic, reviewInfographic } from "../utils/infographics";

export function CleanupReview({
  items,
  method,
  onConfirm,
}: {
  items: Artifact[];
  method: CleanupMethod;
  onConfirm: () => Promise<CleanupResult[] | undefined>;
}) {
  const [results, setResults] = useState<CleanupResult[]>();
  const [working, setWorking] = useState(false);
  const infographic = useMemo(() => reviewInfographic(items, environment.appearance), [items]);
  if (results) return <CleanupReport results={results} method={method} />;
  const title = method === "trash" ? "Move to Trash" : "Permanently Delete";
  const markdown = `# Review ${items.length} ${items.length === 1 ? "Directory" : "Directories"}\n\n${method === "trash" ? "Files go to Trash. This does not immediately release disk space." : "**These directories will be permanently deleted. This cannot be undone.**"}\n\n${infographic}\n\n${items.map((item) => `- **${markdownText(item.path)}** — ${formatSize(item.size)} · ${item.risk}${item.reason ? ` — ${markdownText(item.reason)}` : ""}`).join("\n\n")}\n\nOnly these exact paths will be processed. Each directory is revalidated immediately before cleanup. Risk flags are advisory; active processes may still be using these files.`;
  return (
    <Detail
      navigationTitle={`${title} — Review`}
      isLoading={working}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Reviewed Paths" content={items.map((item) => item.path).join("\n")} />
          <Action
            title={`Confirm ${title}`}
            style={Action.Style.Destructive}
            icon={method === "trash" ? Icon.Trash : Icon.XMarkCircle}
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

export function CleanupReport({ results, method }: { results: CleanupResult[]; method: CleanupMethod }) {
  const successes = results.filter((result) => result.status === "success");
  const infographic = useMemo(() => reportInfographic(results, environment.appearance), [results]);
  return (
    <Detail
      navigationTitle="Cleanup Report"
      markdown={`# Cleanup Complete\n\n${method === "trash" ? "Files were moved to Trash; disk space has not yet been released." : "Files were permanently deleted. Actual reclaimed disk space may differ from the estimate."}\n\n${infographic}\n\n${successes.length} succeeded · ${results.filter((r) => r.status === "missing").length} already missing · ${results.filter((r) => r.status === "failed").length} failed\n\n${estimatedTotal(successes)} processed.\n\n${results.map((result) => `- **${markdownText(result.path)}**\n\n  ${result.status === "success" ? (method === "trash" ? "Moved to Trash" : "Permanently deleted") : result.status === "missing" ? "Already missing; removed from results" : "Failed"}${result.error ? ` — ${markdownText(result.error)}` : ""}`).join("\n\n")}`}
    />
  );
}
