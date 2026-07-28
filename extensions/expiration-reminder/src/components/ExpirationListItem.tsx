import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ReactNode } from "react";
import { ExpirationItem } from "../api/types";
import { formatDate, parseApiDate, relativeExpiry, urgencyColor, urgencyIcon } from "../lib/dates";
import { expirationWebUrl } from "../lib/links";
import { AccountActions, OpenInWebAppAction } from "./actions";
import { ExpirationDetail } from "./ExpirationDetail";

/**
 * A single expiration item row, reused by the expired / about-to-expire / search
 * / contact-expiration commands. `windowDays` tunes the urgency color scale.
 * `extraActions` lets a command inject a command-specific action (e.g. "Back").
 */
export function ExpirationListItem({
  item,
  windowDays = 30,
  extraActions,
}: {
  item: ExpirationItem;
  windowDays?: number;
  extraActions?: ReactNode;
}) {
  const date = parseApiDate(item.expiration_date);
  const category = item.category?.name ?? item.category_name ?? "Generic";

  const accessories: List.Item.Accessory[] = [
    {
      tag: { value: relativeExpiry(date), color: urgencyColor(date, windowDays) },
      tooltip: formatDate(date),
    },
  ];

  return (
    <List.Item
      icon={{ source: urgencyIcon(date), tintColor: urgencyColor(date, windowDays) }}
      title={item.name}
      subtitle={category}
      accessories={accessories}
      keywords={[category, item.status ?? ""]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="View Details" icon={Icon.Sidebar} target={<ExpirationDetail item={item} />} />
            <OpenInWebAppAction url={expirationWebUrl(item.id)} entityType="expiration_item" />
            <Action.CopyToClipboard title="Copy Name" content={item.name} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            {extraActions}
          </ActionPanel.Section>
          <AccountActions />
        </ActionPanel>
      }
    />
  );
}
