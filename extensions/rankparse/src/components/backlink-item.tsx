import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { BacklinkRow } from "../lib/types";

export function BacklinkListItem({ row, itemKey }: { row: BacklinkRow; itemKey: string }) {
  return (
    <List.Item
      key={itemKey}
      icon={Icon.Link}
      title={row.from_domain}
      subtitle={row.anchor_text ?? "(no anchor text)"}
      accessories={[
        { text: row.link_type ?? undefined },
        { date: row.crawled_at ? new Date(row.crawled_at) : undefined },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Source Page" url={row.from_url} />
          <Action.OpenInBrowser title="Open Target Page" url={row.to_url} />
          <Action.CopyToClipboard title="Copy Source URL" content={row.from_url} />
        </ActionPanel>
      }
    />
  );
}
