/**
 * Draft payment list item component.
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { DraftPayment } from "../../api/endpoints";
import { formatCurrency } from "../../lib/formatters";
import { getDraftPaymentStatusAppearance } from "../../lib/status-helpers";
import { copyToClipboard } from "../../lib/actions";

interface DraftPaymentItemProps {
  draft: DraftPayment;
}

export function DraftPaymentItem({ draft }: DraftPaymentItemProps) {
  const firstEntry = draft.entries?.[0];
  const amount = firstEntry?.amount ? formatCurrency(firstEntry.amount.value, firstEntry.amount.currency) : "Unknown";
  const counterparty = firstEntry?.counterparty_alias?.name || firstEntry?.counterparty_alias?.value || "Unknown";
  const statusAppearance = getDraftPaymentStatusAppearance(
    draft.status as "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED",
  );

  return (
    <List.Item
      title={counterparty}
      subtitle={firstEntry?.description || ""}
      accessories={[
        { date: new Date(draft.created), tooltip: "Created" },
        { text: amount, icon: Icon.BankNote, tooltip: "Amount" },
        {
          icon: statusAppearance.icon,
          tag: { value: draft.status, color: statusAppearance.color },
          tooltip: "Status",
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Copy Amount"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(firstEntry?.amount?.value ?? "", "amount")}
          />
          <Action.OpenInBrowser title="Open in Bunq" url="https://bunq.com/app" />
        </ActionPanel>
      }
    />
  );
}
