/**
 * Create share invite form component.
 */

import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { createShareInvite, type MonetaryAccount, type ShareInviteCreate } from "../../api/endpoints";
import { formatDateForApi, detectPointerType } from "../../lib/formatters";
import { getErrorMessage } from "../../lib/errors";

type ShareType = "full_access" | "read_only" | "draft_payment";

interface CreateShareInviteFormProps {
  account: MonetaryAccount;
  session: ReturnType<typeof useBunqSession>;
  onCreated: () => void;
}

export function CreateShareInviteForm({ account, session, onCreated }: CreateShareInviteFormProps) {
  const { pop } = useNavigation();
  const [counterparty, setCounterparty] = useState("");
  const [shareType, setShareType] = useState<ShareType>("read_only");
  const [hasDateRange, setHasDateRange] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!counterparty.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Counterparty is required" });
      return;
    }

    setIsSubmitting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating share invite..." });

      const pointerType = detectPointerType(counterparty.trim());
      let shareDetail: ShareInviteCreate["share_detail"] = {};

      switch (shareType) {
        case "full_access":
          shareDetail = {
            payment: {
              make_payments: true,
              make_draft_payments: true,
              view_balance: true,
              view_old_events: true,
              view_new_events: true,
            },
          };
          break;
        case "read_only":
          shareDetail = {
            read_only: {
              view_balance: true,
              view_old_events: true,
              view_new_events: true,
            },
          };
          break;
        case "draft_payment":
          shareDetail = {
            draft_payment: {
              make_draft_payments: true,
              view_balance: true,
              view_old_events: true,
              view_new_events: true,
            },
          };
          break;
      }

      const invite: ShareInviteCreate = {
        counter_user_alias: {
          type: pointerType,
          value: counterparty.trim(),
        },
        share_detail: shareDetail,
        status: "PENDING",
        ...(hasDateRange && startDate ? { start_date: formatDateForApi(startDate) } : {}),
        ...(hasDateRange && endDate ? { end_date: formatDateForApi(endDate) } : {}),
      };

      await withSessionRefresh(session, () =>
        createShareInvite(session.userId!, account.id, invite, session.getRequestOptions()),
      );

      await showToast({ style: Toast.Style.Success, title: "Share invite sent" });
      onCreated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create share invite",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Share - ${account.description}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Invite" icon={Icon.Envelope} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Share "${account.description}" with another bunq user`} />
      <Form.TextField
        id="counterparty"
        title="Counterparty"
        placeholder="Email, phone, or IBAN"
        value={counterparty}
        onChange={setCounterparty}
        info="The bunq user you want to share with"
      />
      <Form.Dropdown
        id="shareType"
        title="Access Level"
        value={shareType}
        onChange={(v) => setShareType(v as ShareType)}
      >
        <Form.Dropdown.Item value="read_only" title="Read Only" icon={Icon.Eye} />
        <Form.Dropdown.Item value="draft_payment" title="Draft Payments" icon={Icon.Document} />
        <Form.Dropdown.Item value="full_access" title="Full Access" icon={Icon.Star} />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox
        id="hasDateRange"
        label="Set time limit"
        value={hasDateRange}
        onChange={setHasDateRange}
        info="Access will automatically expire after the end date"
      />
      {hasDateRange && (
        <>
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
        </>
      )}
    </Form>
  );
}
