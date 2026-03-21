/**
 * Request list item component for outgoing requests.
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { RequestInquiry } from "../../api/endpoints";
import { formatCurrency } from "../../lib/formatters";
import { getRequestStatusAppearance } from "../../lib/status-helpers";
import { copyToClipboard } from "../../lib/actions";

interface RequestItemProps {
  request: RequestInquiry;
}

export function RequestItem({ request }: RequestItemProps) {
  const amount = formatCurrency(request.amount_inquired?.value ?? "0", request.amount_inquired?.currency ?? "EUR");
  const counterparty = request.counterparty_alias?.name || request.counterparty_alias?.value || "Unknown";
  const statusAppearance = getRequestStatusAppearance(request.status);

  return (
    <List.Item
      title={counterparty}
      subtitle={request.description || ""}
      accessories={[
        { date: new Date(request.created), tooltip: "Created" },
        { text: amount, icon: Icon.BankNote, tooltip: "Amount requested" },
        {
          icon: statusAppearance.icon,
          tag: { value: request.status, color: statusAppearance.color },
          tooltip: "Status",
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Copy Amount"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(request.amount_inquired?.value ?? "0", "amount")}
          />
          <Action
            title="Copy Description"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(request.description || "", "description")}
          />
        </ActionPanel>
      }
    />
  );
}
