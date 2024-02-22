import { List, Icon, Image, Color, ActionPanel, Action } from "@raycast/api";
import { Status } from "../utils/types";
import {
  statusParser,
  getNameForVisibility,
  getIconForVisibility,
  isMyStatus,
  contentExtractor,
  dateTimeFormatter,
  isVisiblityPrivate,
} from "../utils/helpers";

import StatusAction from "./StatusActions";
import { useInteract } from "../hooks/useInteraction";
import MyStatusActions from "./MyStatusActions";
interface StatusItemProps {
  status: Status;
  showMetaData?: boolean;
  originalStatus?: Status;
}

const StatusItem: React.FC<StatusItemProps> = ({ status, showMetaData, originalStatus }) => {
  const content = status.spoiler_text || status.content;
  const time = dateTimeFormatter(new Date(status.created_at), "short");

  const { statusInfo, toggleReblog, toggleFavourite, toggleBookmark } = useInteract(status);

  return (
    <List.Item
      title={contentExtractor(content)}
      icon={{
        source: status.account.avatar,
        mask: Image.Mask.Circle,
      }}
      accessories={isVisiblityPrivate(status.visibility) ? [{ icon: getIconForVisibility(status.visibility) }] : []}
      detail={
        <List.Item.Detail
          markdown={statusParser(status, "id")}
          metadata={
            showMetaData ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Boosts"
                  text={String(statusInfo.reblogsCount)}
                  icon={{
                    source: Icon.Repeat,
                    tintColor: statusInfo.reblogged ? Color.Purple : Color.PrimaryText,
                  }}
                />
                <List.Item.Detail.Metadata.Label
                  title="Favorites"
                  text={String(statusInfo.favouritesCount)}
                  icon={{
                    source: Icon.Star,
                    tintColor: statusInfo.favourited ? Color.Yellow : Color.PrimaryText,
                  }}
                />
                <List.Item.Detail.Metadata.Label
                  title="Replies"
                  text={String(status.replies_count)}
                  icon={Icon.Reply}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Visibility"
                  text={getNameForVisibility(status.visibility)}
                  icon={getIconForVisibility(status.visibility)}
                />
                <List.Item.Detail.Metadata.Label title="Published Time" text={time} />
                {originalStatus?.reblog && (
                  <List.Item.Detail.Metadata.Label
                    title="Boosted by"
                    text={originalStatus.account.display_name}
                    icon={{
                      source: originalStatus.account.avatar,
                      mask: Image.Mask.Circle,
                    }}
                  />
                )}
              </List.Item.Detail.Metadata>
            ) : null
          }
        />
      }
      actions={
        <ActionPanel>
          <StatusAction
            status={status}
            statusInfo={statusInfo}
            toggleReblog={toggleReblog}
            toggleFavourite={toggleFavourite}
            toggleBookmark={toggleBookmark}
          />
          {isMyStatus(status.account) && <MyStatusActions status={status} />}
          {status.url && <Action.OpenInBrowser url={status.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />}
        </ActionPanel>
      }
    />
  );
};

export default StatusItem;
