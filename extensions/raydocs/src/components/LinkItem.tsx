import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Link } from "@/types";

type Props = {
  link: Link;
};

export default function LinkItem({ link }: Props) {
  return (
    <List.Item
      title={link.title}
      subtitle={link.url.path}
      icon={{ source: "./extension-icon.png" }}
      accessories={[
        {
          icon: link.url.external ? Icon.Link : undefined,
          tooltip: link.url.external ? "External Link" : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={link.url.path} />
          <Action.CopyToClipboard title="Copy URL to Clipboard" content={link.url.path} />
        </ActionPanel>
      }
    />
  );
}
