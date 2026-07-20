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
    const trailingNumber = getTrailingNumberFromUrl(item.subject?.html_url ?? "");
    return (
      <List.Item
        key={item.id || item.url || item.subject?.url || item.updated_at || item.subject?.title || "notification"}
        icon={getNotificationIcon(item)}
        title={item.subject?.title || "[No Title]"}
        subtitle={item.repository?.full_name || "[No Repository]"}
        accessories={[
          ...(item.pinned ? [{ icon: Icon.Tack } as const] : []),
          { text: { value: item.subject?.type ?? "", color: Color.PrimaryText } },
          ...(trailingNumber ? [{ text: { value: `#${trailingNumber}`, color: Color.SecondaryText } }] : []),
        ]}
        actions={<NotificationActions item={item} mutate={mutate} />}
      />
    );
  });
}
