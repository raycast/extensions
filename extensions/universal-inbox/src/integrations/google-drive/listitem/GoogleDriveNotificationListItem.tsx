import { GoogleDriveCommentPreview } from "../preview/GoogleDriveCommentPreview";
import { NotificationActions } from "../../../action/NotificationActions";
import { NotificationListItemProps } from "../../../notification";
import { Icon, Color, List } from "@raycast/api";
import { GoogleDriveComment } from "../types";

export function GoogleDriveNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  if (notification.source_item.data.type !== "GoogleDriveComment") return null;

  const comment: GoogleDriveComment = notification.source_item.data.content;

  const accessories: List.Item.Accessory[] = [
    {
      date: new Date(notification.updated_at),
      tooltip: `Updated at ${notification.updated_at}`,
    },
  ];

  if (comment.resolved) {
    accessories.unshift({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: "Resolved",
    });
  }

  if (comment.replies.length > 0) {
    accessories.unshift({
      text: `${comment.replies.length}`,
      icon: Icon.Message,
      tooltip: `${comment.replies.length} repl${comment.replies.length === 1 ? "y" : "ies"}`,
    });
  }

  return (
    <List.Item
      key={notification.id}
      title={notification.title}
      icon={Icon.Document}
      subtitle={comment.file_name}
      accessories={accessories}
      actions={
        <NotificationActions
          notification={notification}
          detailsTarget={<GoogleDriveCommentPreview notification={notification} comment={comment} />}
          mutate={mutate}
        />
      }
    />
  );
}
