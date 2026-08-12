/**
 * Scheduled payment list item component.
 */

import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { cancelScheduledPayment, type ScheduledPayment } from "../../api/endpoints";
import { formatCurrency } from "../../lib/formatters";
import { getScheduledPaymentStatusAppearance } from "../../lib/status-helpers";
import { getErrorMessage } from "../../lib/errors";
import { copyToClipboard } from "../../lib/actions";

interface ScheduledPaymentItemProps {
  payment: ScheduledPayment;
  userId: string;
  accountId: number;
  session: ReturnType<typeof useBunqSession>;
  onUpdate: () => void;
}

export function ScheduledPaymentItem({ payment, userId, accountId, session, onUpdate }: ScheduledPaymentItemProps) {
  const amount = formatCurrency(payment.payment.amount.value, payment.payment.amount.currency);
  const counterparty =
    payment.payment.counterparty_alias?.name || payment.payment.counterparty_alias?.value || "Unknown";
  const canCancel = payment.status === "ACTIVE";
  const statusAppearance = getScheduledPaymentStatusAppearance(payment.status);

  const handleCancel = async () => {
    const confirmed = await confirmAlert({
      title: "Cancel Scheduled Payment",
      message: `Cancel ${amount} to ${counterparty}?`,
      primaryAction: { title: "Cancel Payment", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Cancelling..." });
      await withSessionRefresh(session, () =>
        cancelScheduledPayment(userId, accountId, payment.id, session.getRequestOptions()),
      );
      await showToast({ style: Toast.Style.Success, title: "Payment cancelled" });
      onUpdate();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to cancel", message: getErrorMessage(error) });
    }
  };

  return (
    <List.Item
      title={counterparty}
      subtitle={payment.payment.description || ""}
      accessories={[
        { tag: { value: payment.schedule.recurrence_unit, color: Color.Blue }, tooltip: "Recurrence" },
        { date: new Date(payment.schedule.time_start), tooltip: "Start date" },
        { text: amount, icon: Icon.BankNote, tooltip: "Amount" },
        {
          icon: statusAppearance.icon,
          tag: { value: payment.status, color: statusAppearance.color },
          tooltip: "Status",
        },
      ]}
      actions={
        <ActionPanel>
          {canCancel && (
            <Action
              title="Cancel Scheduled Payment"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleCancel}
            />
          )}
          <Action
            title="Copy Amount"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(payment.payment.amount.value, "amount")}
          />
        </ActionPanel>
      }
    />
  );
}
