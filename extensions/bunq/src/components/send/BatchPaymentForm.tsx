/**
 * Batch payment form component for sending multiple payments at once.
 */

import { Action, ActionPanel, Alert, confirmAlert, Form, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import type { useAccounts } from "../../hooks/useAccounts";
import { createPaymentBatch } from "../../api/endpoints";
import { AccountFormDropdown } from "../../components";
import { formatCurrency, detectPointerType } from "../../lib/formatters";
import { DEFAULT_CURRENCY } from "../../lib/constants";
import { getErrorMessage } from "../../lib/errors";

interface BatchPaymentEntry {
  amount: string;
  recipient: string;
  recipientName: string;
  description: string;
}

interface BatchPaymentFormProps {
  session: ReturnType<typeof useBunqSession>;
  accounts: ReturnType<typeof useAccounts>["accounts"];
}

export function BatchPaymentForm({ session, accounts }: BatchPaymentFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [entriesText, setEntriesText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseEntries = (text: string): BatchPaymentEntry[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    return lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return {
        recipient: parts[0] || "",
        amount: parts[1] || "",
        recipientName: parts[2] || "",
        description: parts[3] || "",
      };
    });
  };

  const handleSubmit = async () => {
    if (!selectedAccountId || !entriesText) {
      await showToast({ style: Toast.Style.Failure, title: "Missing fields" });
      return;
    }

    const entries = parseEntries(entriesText);

    if (entries.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No valid entries" });
      return;
    }

    // Validate all entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      if (!entry.recipient || !entry.amount) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Invalid entry ${i + 1}`,
          message: "Each entry needs recipient and amount",
        });
        return;
      }
      const amount = parseFloat(entry.amount);
      if (isNaN(amount) || amount <= 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Invalid amount in entry ${i + 1}`,
        });
        return;
      }
    }

    const totalAmount = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const formattedTotal = formatCurrency(totalAmount.toFixed(2), DEFAULT_CURRENCY);

    const confirmed = await confirmAlert({
      title: "Confirm Batch Payment",
      message: `Send ${entries.length} payment${entries.length > 1 ? "s" : ""} totaling ${formattedTotal}?`,
      primaryAction: { title: "Send Batch", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Sending batch payment..." });

      await withSessionRefresh(session, () =>
        createPaymentBatch(
          session.userId!,
          parseInt(selectedAccountId, 10),
          {
            payments: entries.map((entry) => ({
              amount: { value: parseFloat(entry.amount).toFixed(2), currency: DEFAULT_CURRENCY },
              counterparty_alias: {
                type: detectPointerType(entry.recipient),
                value: entry.recipient.trim(),
                name: entry.recipientName.trim() || undefined,
              },
              description: entry.description.trim() || "Batch payment",
            })),
          },
          session.getRequestOptions(),
        ),
      );

      const toast = await showToast({
        style: Toast.Style.Success,
        title: "Batch sent",
        message: `${entries.length} payment${entries.length > 1 ? "s" : ""} sent`,
      });
      toast.primaryAction = {
        title: "Open bunq",
        onAction: () => open("https://bunq.com/app"),
      };
      await popToRoot();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Batch payment failed", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Batch Payment"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Batch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Send multiple payments at once. Enter one payment per line in CSV format." />
      <AccountFormDropdown
        id="account"
        title="From Account"
        value={selectedAccountId}
        onChange={setSelectedAccountId}
        accounts={accounts}
      />
      <Form.TextArea
        id="entries"
        title="Payments"
        placeholder="recipient,amount,name (optional),description (optional)&#10;NL12BUNQ1234567890,10.00,John Doe,Payment 1&#10;john@example.com,25.50,,Payment 2"
        value={entriesText}
        onChange={setEntriesText}
      />
      <Form.Description text="Format: recipient,amount,name,description (one per line)" />
    </Form>
  );
}
