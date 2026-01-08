import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { SavedMessage } from "../services/telegram-client";
import { MessageDetail } from "./message-detail";
import { MessageListItemDetail } from "./message-list-item-detail";

interface MessageListItemProps {
  message: SavedMessage;
  isShowingDetail: boolean;
  onRefresh: () => void;
  onToggleDetail: () => void;
}

export function MessageListItem({ message, onRefresh, isShowingDetail, onToggleDetail }: MessageListItemProps) {
  let displayTitle = message.text;
  if (!displayTitle && message.media) {
    const typeName = message.media.type.charAt(0).toUpperCase() + message.media.type.slice(1);
    displayTitle = typeName;
  }

  let icon = Icon.Message;
  if (message.media) {
    switch (message.media.type) {
      case "photo":
      case "image":
        icon = Icon.Image;
        break;
      case "video":
      case "gif":
        icon = Icon.Video;
        break;
      case "audio":
      case "voice":
        icon = Icon.Music;
        break;
      case "file":
      case "document":
        icon = Icon.Document;
        break;
      case "link":
        icon = Icon.Link;
        break;
      case "location":
        icon = Icon.Pin;
        break;
      case "contact":
        icon = Icon.Person;
        break;
      case "poll":
        icon = Icon.BarChart;
        break;
      case "sticker":
        icon = Icon.Emoji;
        break;
      default:
        icon = Icon.Paperclip;
    }
  }

  return (
    <List.Item
      key={message.id}
      icon={icon}
      title={displayTitle}
      accessories={[
        {
          date: message.date,
        },
      ]}
      detail={isShowingDetail ? <MessageListItemDetail message={message} /> : undefined}
      actions={
        <ActionPanel>
          {!isShowingDetail && (
            <Action.Push icon={Icon.Eye} title="View Message" target={<MessageDetail message={message} />} />
          )}
          <Action.CopyToClipboard content={message.text} title="Copy Message" />
          <Action
            icon={isShowingDetail ? Icon.AppWindowSidebarLeft : Icon.AppWindowSidebarRight}
            title={isShowingDetail ? "Hide Detail" : "Show Detail"}
            onAction={onToggleDetail}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh"
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
