import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { ToolResult, findValue, resultMarkdown } from "./mcp";

export function ResultDetail({ title, result }: { title: string; result: ToolResult }) {
  const dataUrl = findValue(result, ["workspaceUrl", "workspace_url", "panelUrl", "panel_url"]);
  return (
    <Detail
      navigationTitle={title}
      markdown={`# ${title}\n\n${resultMarkdown(result)}`}
      actions={
        <ActionPanel>
          {dataUrl.startsWith("https://") ? <Action.OpenInBrowser title="Open in Minds" url={dataUrl} /> : null}
          <Action.CopyToClipboard title="Copy Result" content={resultMarkdown(result)} icon={Icon.Clipboard} />
          <Action.OpenInBrowser title="Open Minds" url="https://getminds.ai/dashboard" />
        </ActionPanel>
      }
    />
  );
}
