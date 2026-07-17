/**
 * Export statement form component for generating bank statements.
 */

import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { createCustomerStatement, type MonetaryAccount } from "../../api/endpoints";
import { formatDateForApi } from "../../lib/formatters";
import { STATEMENT_FORMAT, StatementFormat } from "../../lib/constants";
import { getErrorMessage } from "../../lib/errors";
import { requireUserId } from "../../lib/session-guard";

interface ExportStatementFormProps {
  account: MonetaryAccount;
  session: ReturnType<typeof useBunqSession>;
}

export function ExportStatementForm({ account, session }: ExportStatementFormProps) {
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const date = new Date();
    // Set to 1st of the month before subtracting to avoid month rollover issues
    // e.g., March 31 - 1 month would incorrectly become March 3 (Feb 31 doesn't exist)
    date.setDate(1);
    date.setMonth(date.getMonth() - 1);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [format, setFormat] = useState<StatementFormat>(STATEMENT_FORMAT.PDF);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      await showToast({ style: Toast.Style.Failure, title: "Missing dates" });
      return;
    }

    if (startDate > endDate) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid date range" });
      return;
    }

    setIsSubmitting(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Generating statement..." });

      const userId = requireUserId(session);
      await withSessionRefresh(session, () =>
        createCustomerStatement(
          userId,
          account.id,
          {
            statement_format: format,
            date_start: formatDateForApi(startDate),
            date_end: formatDateForApi(endDate),
            regional_format: "EUROPEAN",
          },
          session.getRequestOptions(),
        ),
      );

      await showToast({ style: Toast.Style.Success, title: "Statement requested", message: "Check your bunq app" });
      await popToRoot();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Export failed", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Export - ${account.description}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export Statement" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Account" text={account.description} />
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        value={startDate}
        onChange={setStartDate}
        type={Form.DatePicker.Type.Date}
      />
      <Form.DatePicker
        id="endDate"
        title="End Date"
        value={endDate}
        onChange={setEndDate}
        type={Form.DatePicker.Type.Date}
      />
      <Form.Dropdown id="format" title="Format" value={format} onChange={(v) => setFormat(v as StatementFormat)}>
        <Form.Dropdown.Item value={STATEMENT_FORMAT.PDF} title="PDF" />
        <Form.Dropdown.Item value={STATEMENT_FORMAT.CSV} title="CSV" />
        <Form.Dropdown.Item value={STATEMENT_FORMAT.MT940} title="MT940" />
      </Form.Dropdown>
    </Form>
  );
}
