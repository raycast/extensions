import { Color, Icon, List } from "@raycast/api";
import NotificationActions from "./notification-actions";
import { getTrailingNumberFromUrl } from "../../utils/string";
import type { PaginatedCachedPromiseMutate } from "../../hooks/usePaginatedCachedPromise";
import { NotificationThread } from "../../types/api";
import { getNotificationIcon } from "../../utils/icons";

export default function NotificationMenu(props: {
  items: NotificationThread[];
  revalidate?: () => void;
  mutate?: PaginatedCachedPromiseMutate<NotificationThread>;
}) {
  return props.items.map((item) => {
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
          //{ text: `[${item.id}]` },
        ]}
        actions={<NotificationActions item={item} mutate={props.mutate} />}
      />
    );
  });
}
