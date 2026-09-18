import { Action, ActionPanel, confirmAlert, Detail, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { sendBulk, type BulkSendResponse } from "./api.js";
import { parseRecipientFile } from "./file-import.js";
import { InputError, requireSenderId, validateContent } from "./lib.js";
import { bulkResultMarkdown, importPreviewMarkdown } from "./result-ui.js";
import { usePinnedSenderId } from "./sender-id.js";

type FormValues = { senderId: string; file: string[]; content: string };
type SendPreview = { senderId: string; recipients: string[]; content: string };

export default function SendSmsFromFile() {
  const [preview, setPreview] = useState<SendPreview>();
  const [result, setResult] = useState<BulkSendResponse>();
  const [senderIdError, setSenderIdError] = useState<string>();
  const [fileError, setFileError] = useState<string>();
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

  if (preview) {
    return (
      <Detail
        markdown={importPreviewMarkdown(preview.recipients)}
        actions={
          <ActionPanel>
            <Action title="Confirm and Send" onAction={() => sendPreview(preview)} />
            <Action title="Choose a Different File" onAction={() => setPreview(undefined)} />
          </ActionPanel>
        }
      />
    );
  }

  async function handleSubmit(values: FormValues) {
    setSenderIdError(undefined);
    setFileError(undefined);
    setContentError(undefined);

    let senderId: string;
    try {
      senderId = requireSenderId(values.senderId);
    } catch (caught) {
      setSenderIdError(inputMessage(caught));
      return;
    }

    let content: string;
    try {
      content = validateContent(values.content);
    } catch (caught) {
      setContentError(inputMessage(caught));
      return;
    }

    if (values.file.length !== 1) {
      setFileError("Choose one CSV file.");
      return;
    }

    try {
      const recipients = await parseRecipientFile(values.file[0]);
      setPreview({ senderId, recipients, content });
    } catch (caught) {
      setFileError(inputMessage(caught));
    }
  }

  async function sendPreview(nextPreview: SendPreview) {
    if (isSending) return;

    setIsSending(true);
    const confirmed = await confirmAlert({
      title: "Send SMS to Imported Recipients?",
      message: `This sends one message to ${nextPreview.recipients.length} recipient${nextPreview.recipients.length === 1 ? "" : "s"}.`,
      primaryAction: { title: "Send SMS" },
    });
    if (!confirmed) {
      setIsSending(false);
      return;
    }

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sending Bulk SMS…",
      });
      const response = await sendBulk(
        apiKey,
        nextPreview.senderId,
        nextPreview.recipients.map((recipient) => ({
          recipient,
          content: nextPreview.content,
        })),
      );
      toast.style = Toast.Style.Success;
      toast.title = "Bulk SMS sent";
      setResult(response);
      setPreview(undefined);
    } catch (caught) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Bulk SMS was not sent",
        message: caught instanceof Error ? caught.message : "Unable to send SMS.",
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
          <Action.SubmitForm title="Preview Recipients" onSubmit={handleSubmit} />
          <Action title="Pin Sender ID" onAction={pinSenderId} />
          {pinnedSenderId ? <Action title="Clear Pinned Sender ID" onAction={clearPinnedSenderId} /> : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="senderId"
        title="Sender ID"
        placeholder="6addad95-f6c8-5929-8b5a-c8ef52067ea6"
        value={senderId}
        onChange={setSenderId}
        error={senderIdError}
      />
      <Form.FilePicker
        id="file"
        title="Recipient File"
        allowMultipleSelection={false}
        info="CSV only. Use a phone-number column or a headerless first column."
        error={fileError}
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
