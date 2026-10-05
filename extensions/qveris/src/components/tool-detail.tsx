import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { ExecuteCapabilityForm } from "./execute-capability-form";
import { formatCost, formatLatency, formatReliability, markdownForTool } from "../lib/format";
import type { ToolInfo } from "../lib/types";

export function ToolDetail({ tool, searchId }: { tool: ToolInfo; searchId: string }) {
  const documentationUrl = safeHttpUrl(tool.docs_url ?? tool.provider_website_url);

  return (
    <Detail
      markdown={markdownForTool(tool)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Tool ID" text={tool.tool_id} />
          <Detail.Metadata.Label title="Provider" text={tool.provider_name ?? "Not provided"} />
          <Detail.Metadata.Label title="Cost" text={formatCost(tool)} />
          <Detail.Metadata.Label title="Reliability" text={formatReliability(tool)} />
          <Detail.Metadata.Label title="Average Latency" text={formatLatency(tool)} />
          {tool.region ? <Detail.Metadata.Label title="Region" text={tool.region} /> : null}
          {tool.final_score !== undefined ? (
            <Detail.Metadata.Label title="Match Score" text={`${(tool.final_score * 100).toFixed(1)}%`} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Run Capability…"
            icon={Icon.Play}
            target={<ExecuteCapabilityForm tool={tool} searchId={searchId} />}
          />
          <Action.CopyToClipboard title="Copy Tool ID" icon={Icon.Clipboard} content={tool.tool_id} />
          {documentationUrl ? (
            <Action.OpenInBrowser title="Open Documentation" icon={Icon.Globe} url={documentationUrl} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
