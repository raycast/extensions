/**
 * BunqMe list item component.
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { BunqMeTab } from "../../api/endpoints";
import { formatCurrency } from "../../lib/formatters";
import { getBunqMeStatusAppearance } from "../../lib/status-helpers";
import { copyToClipboard } from "../../lib/actions";

interface BunqMeItemProps {
  tab: BunqMeTab;
}

export function BunqMeItem({ tab }: BunqMeItemProps) {
  const entry = tab.bunqme_tab_entry;
  const amount = entry.amount_inquired
    ? formatCurrency(entry.amount_inquired.value, entry.amount_inquired.currency)
    : "Any amount";
  const statusAppearance = getBunqMeStatusAppearance(tab.status);

  return (
    <List.Item
      title={entry.description || "bunq.me Link"}
      subtitle={amount}
      accessories={[
        { date: new Date(tab.created), tooltip: "Created" },
        {
          icon: statusAppearance.icon,
          tag: { value: tab.status.replace(/_/g, " "), color: statusAppearance.color },
          tooltip: "Status",
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Copy Link"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(tab.bunqme_tab_share_url, "link")}
          />
          <Action.OpenInBrowser title="Open in Browser" url={tab.bunqme_tab_share_url} />
        </ActionPanel>
      }
    />
  );
}
