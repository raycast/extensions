import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { SavedMessage } from "../services/telegram-client";
import { getMediaTypeIcon, getMediaDisplayTitle } from "../utils/media";
import { extractUrlFromText } from "../utils/message";
import { SavedMessageDetail } from "./saved-message-detail";
import { SavedMessageListItemDetail } from "./saved-message-list-item-detail";
import { ToggleDetailAction, RefreshAction } from "./actions";

interface SavedMessageListItemProps {
  message: SavedMessage;
  isShowingDetail: boolean;
  onRefresh: () => void;
  onToggleDetail: () => void;
}

export function SavedMessageListItem({
  message,
  isShowingDetail,
  onRefresh,
  onToggleDetail,
}: SavedMessageListItemProps) {
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

  const url = extractUrlFromText(message.text);

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
      detail={isShowingDetail ? <SavedMessageListItemDetail message={message} /> : undefined}
      actions={
        <ActionPanel>
          {url ? (
            <>
              <Action.OpenInBrowser url={url} title="Open Link" />
              {!isShowingDetail && (
                <Action.Push icon={Icon.Eye} title="View Message" target={<SavedMessageDetail message={message} />} />
              )}
              <Action.CopyToClipboard content={url} title="Copy Link" />
              <Action.CopyToClipboard content={message.text} title="Copy Message" />
            </>
          ) : (
            <>
              {!isShowingDetail && (
                <Action.Push icon={Icon.Eye} title="View Message" target={<SavedMessageDetail message={message} />} />
              )}
              <Action.CopyToClipboard content={message.text} title="Copy Message" />
            </>
          )}
          <ToggleDetailAction isShowingDetail={isShowingDetail} onToggle={onToggleDetail} />
          <RefreshAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
