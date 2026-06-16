import { APINotificationPreview } from "../preview/APINotificationPreview";
import { NotificationActions } from "../../../action/NotificationActions";
import { NotificationListItemProps } from "../../../notification";
import { Icon, List } from "@raycast/api";
import { WebPage } from "../types";

export function APINotificationListItem({ notification, mutate }: NotificationListItemProps) {
  if (notification.source_item.data.type !== "WebPage") return null;

  const webPage: WebPage = notification.source_item.data.content;

  const accessories: List.Item.Accessory[] = [
    {
      date: new Date(notification.updated_at),
      tooltip: `Updated at ${notification.updated_at}`,
    },
  ];

  return (
    <List.Item
      key={notification.id}
      title={notification.title}
      icon={Icon.Globe}
      subtitle={webPage.url}
      accessories={accessories}
      actions={
        <NotificationActions
          notification={notification}
          detailsTarget={<APINotificationPreview notification={notification} webPage={webPage} />}
          mutate={mutate}
        />
      }
    />
  );
}
