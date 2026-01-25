/**
 * Draft payment form component for payments requiring approval.
 */

import { Action, ActionPanel, confirmAlert, Form, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import type { useAccounts } from "../../hooks/useAccounts";
import { createDraftPayment } from "../../api/endpoints";
import { AccountFormDropdown } from "../../components";
import { formatCurrency, detectPointerType } from "../../lib/formatters";
import { DEFAULT_CURRENCY } from "../../lib/constants";
import { getErrorMessage } from "../../lib/errors";
import { requireUserId } from "../../lib/session-guard";

interface DraftPaymentFormProps {
  session: ReturnType<typeof useBunqSession>;
  accounts: ReturnType<typeof useAccounts>["accounts"];
}

export function DraftPaymentForm({ session, accounts }: DraftPaymentFormProps) {
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
      title: "Create Draft Payment",
      message: `Create a draft for ${formattedAmount} to ${recipientName || recipient}?\n\nFrom: ${selectedAccount?.description || "Selected account"}\n\nThis will require approval from other account holders.`,
      primaryAction: { title: "Create Draft" },
    });

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating draft payment..." });

      const userId = requireUserId(session);
      await withSessionRefresh(session, () =>
        createDraftPayment(
          userId,
          parseInt(selectedAccountId, 10),
          {
            number_of_required_accepts: 1,
            entries: [
              {
                amount: { value: parsedAmount.toFixed(2), currency: DEFAULT_CURRENCY },
                counterparty_alias: {
                  type: detectPointerType(recipient),
                  value: recipient.trim(),
                  name: recipientName.trim() || undefined,
                },
                description: description.trim(),
              },
            ],
          },
          session.getRequestOptions(),
        ),
      );

      const toast = await showToast({
        style: Toast.Style.Success,
        title: "Draft created",
        message: "Awaiting approval",
      });
      toast.primaryAction = {
        title: "Open bunq",
        onAction: () => open("https://bunq.com/app"),
      };
      await popToRoot();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Draft creation failed", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Create Draft Payment"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Draft" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Draft payments require approval from other account holders before being sent." />
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
