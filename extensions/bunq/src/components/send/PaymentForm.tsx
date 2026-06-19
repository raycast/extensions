/**
 * Payment form component for sending one-time payments.
 */

import { Action, ActionPanel, Alert, confirmAlert, Form, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import type { useAccounts } from "../../hooks/useAccounts";
import { createPayment } from "../../api/endpoints";
import { AccountFormDropdown } from "../../components";
import { formatCurrency, detectPointerType } from "../../lib/formatters";
import { DEFAULT_CURRENCY } from "../../lib/constants";
import { getErrorMessage } from "../../lib/errors";
import { requireUserId } from "../../lib/session-guard";

interface PaymentFormProps {
  session: ReturnType<typeof useBunqSession>;
  accounts: ReturnType<typeof useAccounts>["accounts"];
}

export function PaymentForm({ session, accounts }: PaymentFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedAccountId || !amount || !recipient || !description) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing fields",
        message: "Please fill in all required fields",
      });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid amount" });
      return;
    }

    const selectedAccount = accounts?.find((a) => a.id.toString() === selectedAccountId);
    const formattedAmount = formatCurrency(amount, DEFAULT_CURRENCY);

    const confirmed = await confirmAlert({
      title: "Confirm Payment",
      message: `Send ${formattedAmount} to ${recipientName || recipient}?\n\nFrom: ${selectedAccount?.description || "Selected account"}`,
      primaryAction: { title: "Send Payment", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Sending payment..." });

      const userId = requireUserId(session);
      await withSessionRefresh(session, () =>
        createPayment(
          userId,
          parseInt(selectedAccountId, 10),
          {
            amount: { value: parsedAmount.toFixed(2), currency: DEFAULT_CURRENCY },
            counterparty_alias: {
              type: detectPointerType(recipient),
              value: recipient.trim(),
              name: recipientName.trim() || undefined,
            },
            description: description.trim(),
          },
          session.getRequestOptions(),
        ),
      );

      const toast = await showToast({
        style: Toast.Style.Success,
        title: "Payment sent",
        message: `${formattedAmount} sent to ${recipientName || recipient}`,
      });
      toast.primaryAction = {
        title: "Open bunq",
        onAction: () => open("https://bunq.com/app"),
      };
      await popToRoot();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Payment failed", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Send Payment"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Payment" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <AccountFormDropdown
        id="account"
        title="From Account"
        value={selectedAccountId}
        onChange={setSelectedAccountId}
        accounts={accounts}
      />
      <Form.TextField id="amount" title="Amount (EUR)" placeholder="10.00" value={amount} onChange={setAmount} />
      <Form.TextField
        id="recipient"
        title="Recipient"
        placeholder="IBAN, email, or phone number"
        value={recipient}
        onChange={setRecipient}
      />
      <Form.TextField
        id="recipientName"
        title="Recipient Name"
        placeholder="Optional"
        value={recipientName}
        onChange={setRecipientName}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Payment description"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
