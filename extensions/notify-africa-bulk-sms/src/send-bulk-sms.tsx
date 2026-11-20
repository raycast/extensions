import { Action, ActionPanel, confirmAlert, Detail, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { sendBulk, type BulkSendResponse } from "./api.js";
import { InputError, parseBulkRecipients, requireSenderId, validateContent } from "./lib.js";
import { bulkResultMarkdown } from "./result-ui.js";
import { usePinnedSenderId } from "./sender-id.js";

type FormValues = { senderId: string; recipients: string; content: string };

export default function SendBulkSms() {
  const [result, setResult] = useState<BulkSendResponse>();
  const [senderIdError, setSenderIdError] = useState<string>();
  const [recipientsError, setRecipientsError] = useState<string>();
  const [contentError, setContentError] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const { apiKey } = getPreferenceValues<Preferences>();
  const { senderId, setSenderId, pinnedSenderId, pinSenderId, clearPinnedSenderId } = usePinnedSenderId();

  if (result) {
    return (
      <Detail
        markdown={bulkResultMarkdown(result)}
        actions={
          <ActionPanel>
            <Action title="Send Another Batch" onAction={() => setResult(undefined)} />
          </ActionPanel>
        }
      />
    );
  }

  async function handleSubmit(values: FormValues) {
    if (isSending) return;

    setSenderIdError(undefined);
    setRecipientsError(undefined);
    setContentError(undefined);

    let senderId: string;
    try {
      senderId = requireSenderId(values.senderId);
    } catch (caught) {
      setSenderIdError(inputMessage(caught));
      return;
    }

    let recipients: string[];
    try {
      recipients = parseBulkRecipients(values.recipients);
    } catch (caught) {
      setRecipientsError(inputMessage(caught));
      return;
    }

    let content: string;
    try {
      content = validateContent(values.content);
    } catch (caught) {
      setContentError(inputMessage(caught));
      return;
    }

    try {
      setIsSending(true);
      const confirmed = await confirmAlert({
        title: "Send Bulk SMS?",
        message: `This sends one message to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}.`,
        primaryAction: { title: "Send SMS" },
      });

      if (!confirmed) {
        setIsSending(false);
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sending Bulk SMS…",
      });
      const response = await sendBulk(
        apiKey,
        senderId,
        recipients.map((recipient) => ({ recipient, content })),
      );
      toast.style = Toast.Style.Success;
      toast.title = "Bulk SMS sent";
      setResult(response);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to send SMS.";
      await showToast({
        style: Toast.Style.Failure,
        title: "Bulk SMS was not sent",
        message,
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Form
      isLoading={isSending}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isSending ? "Sending…" : "Review and Send"} onSubmit={handleSubmit} />
          <Action title="Pin Sender ID" onAction={pinSenderId} />
          {pinnedSenderId ? <Action title="Clear Pinned Sender ID" onAction={clearPinnedSenderId} /> : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="senderId"
        title="Sender ID"
        placeholder="6addad95-xxxx-xxxx-xxxx-c8ef52067ea6"
        value={senderId}
        onChange={setSenderId}
        error={senderIdError}
      />
      <Form.TextArea
        id="recipients"
        title="Recipients"
        placeholder={"255712345678\n255713456789"}
        info="Separate numbers with commas or new lines."
        error={recipientsError}
      />
      <Form.TextArea
        id="content"
        title="Message"
        placeholder="Your order is ready for collection"
        error={contentError}
      />
    </Form>
  );
}

function inputMessage(caught: unknown): string {
  return caught instanceof InputError ? caught.message : "Check this field.";
}
