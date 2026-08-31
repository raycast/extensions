import { Action, ActionPanel, Icon } from "@raycast/api";

const WEBSITE_URL = "https://mint.dzgapp.com";
const DOCS_URL = "https://mint.dzgapp.com/docs#cli-overview";

export function MintActions({ output, onRefresh }: { output?: string; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
      {output ? <Action.CopyToClipboard title="Copy JSON" content={output} /> : null}
      <Action.OpenInBrowser title="Open Mint Documentation" url={DOCS_URL} />
      <Action.OpenInBrowser title="Download Mint" url={WEBSITE_URL} />
    </ActionPanel>
  );
}
