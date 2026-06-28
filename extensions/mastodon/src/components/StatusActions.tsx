import { Action, ActionPanel, Icon } from "@raycast/api";
import { Status } from "../utils/types";
import { isVisiblityPrivate } from "../utils/helpers";
import ReplyAction from "./ReplyAction";
interface StatusActionProps {
  status: Status;
  toggleReblog: (status: Status) => void;
  toggleFavourite: (status: Status) => void;
  toggleBookmark: (status: Status) => void;
  statusInfo: {
    reblogsCount: number;
    reblogged: boolean;
    favouritesCount: number;
    favourited: boolean;
    bookmarked: boolean;
  };
}

const StatusAction: React.FC<StatusActionProps> = ({
  status,
  toggleReblog,
  toggleFavourite,
  toggleBookmark,
  statusInfo,
}) => (
  <ActionPanel.Section>
    {!isVisiblityPrivate(status.visibility) && (
      <Action
        title={statusInfo.reblogged ? "Undo Boost" : "Boost"}
        icon={statusInfo.reblogged ? Icon.Undo : Icon.Repeat}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
        onAction={() => toggleReblog(status)}
      />
    )}
    <Action
      title={statusInfo.favourited ? "Undo Favourite" : "Favourite"}
      icon={statusInfo.favourited ? Icon.StarDisabled : Icon.Star}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      onAction={() => toggleFavourite(status)}
    />
    <ReplyAction status={status} />
    <Action
      title={statusInfo.bookmarked ? "Remove Bookmark" : "Add Bookmark"}
      icon={statusInfo.bookmarked ? Icon.Minus : Icon.Bookmark}
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      onAction={() => toggleBookmark(status)}
    />
  </ActionPanel.Section>
);

export default StatusAction;
