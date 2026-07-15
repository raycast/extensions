/**
 * Incoming request list item component with actions.
 */

import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { respondToRequest, type RequestResponse } from "../../api/endpoints";
import { formatCurrency } from "../../lib/formatters";
import { getRequestResponseStatusAppearance } from "../../lib/status-helpers";
import { getErrorMessage } from "../../lib/errors";
import { copyToClipboard } from "../../lib/actions";

interface IncomingRequestItemProps {
  request: RequestResponse;
  userId: string;
  accountId: number;
  session: ReturnType<typeof useBunqSession>;
  onUpdate: () => void;
}

export function IncomingRequestItem({ request, userId, accountId, session, onUpdate }: IncomingRequestItemProps) {
  const amount = formatCurrency(request.amount_inquired?.value ?? "0", request.amount_inquired?.currency ?? "EUR");
  const counterparty = request.counterparty_alias?.display_name || request.counterparty_alias?.name || "Unknown";
  const statusAppearance = getRequestResponseStatusAppearance(request.status as "PENDING" | "ACCEPTED" | "REJECTED");
  const isPending = request.status === "PENDING";

  const handlePay = async () => {
    const confirmed = await confirmAlert({
      title: "Pay Request",
      message: `Pay ${amount} to ${counterparty}?`,
      primaryAction: { title: "Pay", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Processing payment..." });
      await withSessionRefresh(session, () =>
        respondToRequest(userId, accountId, request.id, { status: "ACCEPTED" }, session.getRequestOptions()),
      );
      await showToast({ style: Toast.Style.Success, title: "Payment sent" });
      onUpdate();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Payment failed", message: getErrorMessage(error) });
    }
  };

  const handleReject = async () => {
    const confirmed = await confirmAlert({
      title: "Reject Request",
      message: `Reject ${amount} request from ${counterparty}?`,
      primaryAction: { title: "Reject", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Rejecting request..." });
      await withSessionRefresh(session, () =>
        respondToRequest(userId, accountId, request.id, { status: "REJECTED" }, session.getRequestOptions()),
      );
      await showToast({ style: Toast.Style.Success, title: "Request rejected" });
      onUpdate();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to reject", message: getErrorMessage(error) });
    }
  };

  return (
    <List.Item
      title={counterparty}
      subtitle={request.description || ""}
      accessories={[
        { date: new Date(request.created), tooltip: "Created" },
        { text: amount, icon: Icon.BankNote, tooltip: "Amount requested" },
        {
          icon: statusAppearance.icon,
          tag: { value: statusAppearance.label, color: statusAppearance.color },
          tooltip: "Status",
        },
      ]}
      actions={
        <ActionPanel>
          {isPending && (
            <>
              <Action
                title="Pay Request"
                icon={Icon.CheckCircle}
                style={Action.Style.Destructive}
                onAction={handlePay}
              />
              <Action title="Reject Request" icon={Icon.XMarkCircle} onAction={handleReject} />
            </>
          )}
          <Action
            title="Copy Amount"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(request.amount_inquired?.value ?? "0", "amount")}
          />
        </ActionPanel>
      }
    />
  );
}
