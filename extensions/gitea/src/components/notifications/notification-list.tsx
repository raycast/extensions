import { Color, Icon, List } from "@raycast/api";
import NotificationActions from "./notification-actions";
import { getTrailingNumberFromUrl } from "../../utils/string";
import type { PaginatedResourceMutate } from "../../hooks/usePaginatedResource";
import type { NotificationThread } from "../../types/api";
import { getNotificationIcon } from "../../utils/icons";

type NotificationListProps = {
  items: NotificationThread[];
  mutate?: PaginatedResourceMutate<NotificationThread>;
};

export default function NotificationList({ items, mutate }: NotificationListProps) {
  return items.map((item) => {
    return (
      <List.Item
        key={item.id || item.updated_at || "notification"}
        icon={getNotificationIcon(item)}
        title={item.subject?.title || "[No Title]"}
        subtitle={item.repository?.full_name || "[No Repository]"}
        accessories={[
          ...(item.pinned ? [{ icon: Icon.Tack } as const] : []),
          { text: { value: item.subject?.type ?? "", color: Color.PrimaryText } },
          {
            text: {
              value: "#" + (getTrailingNumberFromUrl(item.subject?.html_url ?? "") ?? ""),
              color: Color.SecondaryText,
            },
          },
        ]}
        actions={<NotificationActions item={item} mutate={mutate} />}
      />
    );
  });
}
