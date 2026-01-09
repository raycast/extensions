import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { SavedMessage } from "../services/telegram-client";
import { getMediaTypeIcon, getMediaDisplayTitle } from "../utils/media";
import { MessageDetail } from "./message-detail";
import { MessageListItemDetail } from "./message-list-item-detail";
import { ToggleDetailAction, RefreshAction } from "./actions";

interface MessageListItemProps {
  message: SavedMessage;
  isShowingDetail: boolean;
  onRefresh: () => void;
  onToggleDetail: () => void;
}

export function MessageListItem({ message, onRefresh, isShowingDetail, onToggleDetail }: MessageListItemProps) {
  let displayTitle = message.text;
  if (!displayTitle && message.media) {
    displayTitle = getMediaDisplayTitle(message.media.type);
  }

  let icon: Image.ImageLike = Icon.Message;
  if (message.media?.filePath && (message.media.type === "photo" || message.media.type === "image")) {
    icon = { source: message.media.filePath };
  } else if (message.media) {
    icon = getMediaTypeIcon(message.media.type);
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
          <ToggleDetailAction isShowingDetail={isShowingDetail} onToggle={onToggleDetail} />
          <RefreshAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
