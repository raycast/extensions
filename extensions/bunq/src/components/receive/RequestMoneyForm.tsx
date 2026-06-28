/**
 * Request money form component.
 */

import { Action, ActionPanel, Form, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import type { useAccounts } from "../../hooks/useAccounts";
import { createRequestInquiry } from "../../api/endpoints";
import { AccountFormDropdown } from "../../components";
import { formatCurrency, detectPointerType } from "../../lib/formatters";
import { DEFAULT_CURRENCY } from "../../lib/constants";
import { getErrorMessage } from "../../lib/errors";
import { requireUserId } from "../../lib/session-guard";

interface RequestMoneyFormProps {
  session: ReturnType<typeof useBunqSession>;
  accounts: ReturnType<typeof useAccounts>["accounts"];
}

export function RequestMoneyForm({ session, accounts }: RequestMoneyFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedAccountId || !amount || !recipient || !description) {
      await showToast({ style: Toast.Style.Failure, title: "Missing fields" });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid amount" });
      return;
    }

    setIsSubmitting(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating request..." });

      const userId = requireUserId(session);
      await withSessionRefresh(session, () =>
        createRequestInquiry(
          userId,
          parseInt(selectedAccountId, 10),
          {
            amount_inquired: { value: parsedAmount.toFixed(2), currency: DEFAULT_CURRENCY },
            counterparty_alias: {
              type: detectPointerType(recipient),
              value: recipient.trim(),
              name: recipientName.trim() || undefined,
            },
            description: description.trim(),
            allow_bunqme: true,
          },
          session.getRequestOptions(),
        ),
      );

      const formattedAmount = formatCurrency(amount, DEFAULT_CURRENCY);
      const toast = await showToast({
        style: Toast.Style.Success,
        title: "Request sent",
        message: `${formattedAmount} requested from ${recipientName || recipient}`,
      });
      toast.primaryAction = {
        title: "Open bunq",
        onAction: () => open("https://bunq.com/app"),
      };
      await popToRoot();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Request failed", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Request Money"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Request" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <AccountFormDropdown
        id="account"
        title="To Account"
        value={selectedAccountId}
        onChange={setSelectedAccountId}
        accounts={accounts}
      />
      <Form.TextField id="amount" title="Amount (EUR)" placeholder="10.00" value={amount} onChange={setAmount} />
      <Form.TextField
        id="recipient"
        title="Request From"
        placeholder="IBAN, email, or phone number"
        value={recipient}
        onChange={setRecipient}
      />
      <Form.TextField
        id="recipientName"
        title="Name"
        placeholder="Optional"
        value={recipientName}
        onChange={setRecipientName}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="What is this for?"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
