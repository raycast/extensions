import { ActionPanel, Action } from "@raycast/api";
import Parser from "rss-parser";

interface ActionsProps {
  item: Parser.Item;
}

export default function Actions({ item }: ActionsProps) {
  if (!item.link) {
    return null;
  }

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={item.link} />
      <Action.CopyToClipboard title="Copy Link" content={item.link} />
    </ActionPanel>
  );
}
