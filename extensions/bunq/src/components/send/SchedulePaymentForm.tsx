/**
 * Schedule payment form component for recurring payments.
 */

import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import type { useAccounts } from "../../hooks/useAccounts";
import { createScheduledPayment } from "../../api/endpoints";
import { AccountFormDropdown } from "../../components";
import { formatDateTimeForApi, detectPointerType } from "../../lib/formatters";
import { DEFAULT_CURRENCY, RECURRENCE_UNIT, type RecurrenceUnit } from "../../lib/constants";
import { getErrorMessage } from "../../lib/errors";
import { requireUserId } from "../../lib/session-guard";

interface SchedulePaymentFormProps {
  session: ReturnType<typeof useBunqSession>;
  accounts: ReturnType<typeof useAccounts>["accounts"];
}

export function SchedulePaymentForm({ session, accounts }: SchedulePaymentFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceUnit>(RECURRENCE_UNIT.MONTHLY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedAccountId || !amount || !recipient || !description || !startDate) {
      await showToast({ style: Toast.Style.Failure, title: "Missing fields" });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid amount" });
      return;
    }

    if (endDate && startDate && endDate <= startDate) {
      await showToast({ style: Toast.Style.Failure, title: "End date must be after start date" });
      return;
    }

    setIsSubmitting(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Scheduling payment..." });

      const userId = requireUserId(session);
      await withSessionRefresh(session, () =>
        createScheduledPayment(
          userId,
          parseInt(selectedAccountId, 10),
          {
            payment: {
              amount: { value: parsedAmount.toFixed(2), currency: DEFAULT_CURRENCY },
              counterparty_alias: {
                type: detectPointerType(recipient),
                value: recipient.trim(),
                name: recipientName.trim() || undefined,
              },
              description: description.trim(),
            },
            schedule: endDate
              ? {
                  time_start: formatDateTimeForApi(startDate),
                  time_end: formatDateTimeForApi(endDate),
                  recurrence_unit: recurrence,
                  recurrence_size: 1,
                }
              : {
                  time_start: formatDateTimeForApi(startDate),
                  recurrence_unit: recurrence,
                  recurrence_size: 1,
                },
          },
          session.getRequestOptions(),
        ),
      );

      await showToast({ style: Toast.Style.Success, title: "Payment scheduled" });
      await popToRoot();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Scheduling failed", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Schedule Payment"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Schedule Payment" onSubmit={handleSubmit} />
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
      <Form.Separator />
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        value={startDate}
        onChange={setStartDate}
        type={Form.DatePicker.Type.Date}
      />
      <Form.DatePicker
        id="endDate"
        title="End Date (Optional)"
        value={endDate}
        onChange={setEndDate}
        type={Form.DatePicker.Type.Date}
      />
      <Form.Dropdown
        id="recurrence"
        title="Recurrence"
        value={recurrence}
        onChange={(v) => setRecurrence(v as RecurrenceUnit)}
      >
        <Form.Dropdown.Item value={RECURRENCE_UNIT.ONCE} title="Once" />
        <Form.Dropdown.Item value={RECURRENCE_UNIT.DAILY} title="Daily" />
        <Form.Dropdown.Item value={RECURRENCE_UNIT.WEEKLY} title="Weekly" />
        <Form.Dropdown.Item value={RECURRENCE_UNIT.MONTHLY} title="Monthly" />
        <Form.Dropdown.Item value={RECURRENCE_UNIT.YEARLY} title="Yearly" />
      </Form.Dropdown>
    </Form>
  );
}
