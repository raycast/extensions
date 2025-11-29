import { type ComponentType, memo } from "react";
import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import type { GameItem } from "../api";
import { DEFAULT_MIRROR } from "../constants";

interface GameListItemProps {
  item: GameItem;
}

const GameListItemF = ({ item }: GameListItemProps) => {
  const fullDetailUrl = item.url.startsWith("http") ? item.url : `${DEFAULT_MIRROR}${item.url}`;

  return (
    <List.Item
      title={item.title}
      icon={Icon.GameController}
      detail={
        <List.Item.Detail
          markdown={`# ${item.title}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Size" text={item.size} />
              <List.Item.Detail.Metadata.Label title="Uploaded" text={item.date} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Seeders"
                text={item.seeds}
                icon={{ source: Icon.ArrowUp, tintColor: Color.Green }}
              />
              <List.Item.Detail.Metadata.Label
                title="Leechers"
                text={item.leeches}
                icon={{ source: Icon.ArrowDown, tintColor: Color.Red }}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="Source" target={fullDetailUrl} text="View on CloudTorrents" />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Download">
            <Action.OpenInBrowser title="Download Torrent" url={item.magnet} icon={Icon.Download} />
            <Action.OpenInBrowser title="Open Details in Browser" url={fullDetailUrl} icon={Icon.Globe} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Magnet Link" content={item.magnet} icon={Icon.Clipboard} />
            <Action.CopyToClipboard title="Copy Page URL" content={fullDetailUrl} icon={Icon.Link} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export const GameListItem = memo(GameListItemF) as ComponentType<GameListItemProps>;
