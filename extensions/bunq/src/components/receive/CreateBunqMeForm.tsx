/**
 * Create bunq.me link form component.
 */

import { Action, ActionPanel, Form, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import type { useAccounts } from "../../hooks/useAccounts";
import { createBunqMeTab } from "../../api/endpoints";
import { AccountFormDropdown } from "../../components";
import { DEFAULT_CURRENCY } from "../../lib/constants";
import { getErrorMessage } from "../../lib/errors";
import { copyToClipboard } from "../../lib/actions";

interface CreateBunqMeFormProps {
  session: ReturnType<typeof useBunqSession>;
  accounts: ReturnType<typeof useAccounts>["accounts"];
}

export function CreateBunqMeForm({ session, accounts }: CreateBunqMeFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedAccountId || !description) {
      await showToast({ style: Toast.Style.Failure, title: "Missing fields" });
      return;
    }

    const parsedAmount = amount ? parseFloat(amount) : null;
    if (amount && (isNaN(parsedAmount!) || parsedAmount! <= 0)) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid amount" });
      return;
    }

    setIsSubmitting(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating bunq.me link..." });

      const result = await withSessionRefresh(session, () =>
        createBunqMeTab(
          session.userId!,
          parseInt(selectedAccountId, 10),
          {
            bunqme_tab_entry: parsedAmount
              ? {
                  amount_inquired: { value: parsedAmount.toFixed(2), currency: DEFAULT_CURRENCY },
                  description: description.trim(),
                }
              : {
                  description: description.trim(),
                },
          },
          session.getRequestOptions(),
        ),
      );

      if (result.url) {
        await copyToClipboard(result.url, "bunq.me link");
        const toast = await showToast({
          style: Toast.Style.Success,
          title: "Link created",
          message: "Copied to clipboard",
        });
        toast.primaryAction = {
          title: "Open Link",
          onAction: () => open(result.url!),
        };
      } else {
        await showToast({ style: Toast.Style.Success, title: "Link created" });
      }

      await popToRoot();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to create link", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Create bunq.me Link"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Link" onSubmit={handleSubmit} />
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
      <Form.TextField
        id="amount"
        title="Amount (EUR)"
        placeholder="Optional - leave empty for any amount"
        value={amount}
        onChange={setAmount}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="What is this payment for?"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
