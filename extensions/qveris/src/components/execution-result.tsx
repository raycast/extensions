import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import type { ExecuteResponse } from "../lib/types";
import { stringify } from "../lib/json";

export function ExecutionResult({ response }: { response: ExecuteResponse }) {
  const downloadUrl = findDownloadUrl(response.result);
  const markdown = response.success
    ? `# Capability Result\n\n\`\`\`json\n${stringify(response.result)}\n\`\`\``
    : `# Capability Failed\n\n${response.error_message ?? "QVeris did not return an error message."}`;

  return (
    <Detail
      navigationTitle="Capability Result"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={response.success ? "Succeeded" : "Failed"}
              color={response.success ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Execution ID" text={response.execution_id} />
          {response.tool_id ? <Detail.Metadata.Label title="Tool ID" text={response.tool_id} /> : null}
          {response.billing?.summary ? <Detail.Metadata.Label title="Billing" text={response.billing.summary} /> : null}
          {response.cost !== undefined ? (
            <Detail.Metadata.Label title="Estimated Cost" text={`${response.cost} credits`} />
          ) : null}
          {response.remaining_credits !== undefined ? (
            <Detail.Metadata.Label title="Remaining Credits" text={String(response.remaining_credits)} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" icon={Icon.Clipboard} content={stringify(response.result)} />
          <Action.CopyToClipboard title="Copy Execution ID" icon={Icon.Hashtag} content={response.execution_id} />
          {downloadUrl ? (
            <Action.OpenInBrowser title="Open Full Result" icon={Icon.Download} url={downloadUrl} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function findDownloadUrl(result: unknown): string | undefined {
  if (typeof result !== "object" || result === null || Array.isArray(result)) return undefined;
  const value = (result as Record<string, unknown>).full_content_file_url;
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
