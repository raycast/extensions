import { Action, ActionPanel, confirmAlert, Detail, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { sendBulk, type BulkSendResponse } from "./api.js";
import { InputError, parsePersonalizedMessages, requireSenderId, type SmsMessage } from "./lib.js";
import { personalizedResultsMarkdown, type PersonalizedSmsResult } from "./result-ui.js";
import { usePinnedSenderId } from "./sender-id.js";

type FormValues = { senderId: string; messages: string };

export default function SendPersonalizedSms() {
  const [results, setResults] = useState<PersonalizedSmsResult[]>();
  const [senderIdError, setSenderIdError] = useState<string>();
  const [messagesError, setMessagesError] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const { apiKey } = getPreferenceValues<Preferences>();
  const { senderId, setSenderId, pinnedSenderId, pinSenderId, clearPinnedSenderId } = usePinnedSenderId();

  if (results) {
    return (
      <Detail
        markdown={personalizedResultsMarkdown(results)}
        actions={
          <ActionPanel>
            <Action title="Send More SMS" onAction={() => setResults(undefined)} />
          </ActionPanel>
        }
      />
    );
  }

  async function handleSubmit(values: FormValues) {
    if (isSending) return;

    setSenderIdError(undefined);
    setMessagesError(undefined);

    let senderId: string;
    try {
      senderId = requireSenderId(values.senderId);
    } catch (caught) {
      setSenderIdError(inputMessage(caught));
      return;
    }

    let messages: SmsMessage[];
    try {
      messages = parsePersonalizedMessages(values.messages);
    } catch (caught) {
      setMessagesError(inputMessage(caught));
      return;
    }

    try {
      setIsSending(true);
      const confirmed = await confirmAlert({
        title: "Send Personalized SMS?",
        message: `This sends ${messages.length} individual message${messages.length === 1 ? "" : "s"}.`,
        primaryAction: { title: "Send SMS" },
      });

      if (!confirmed) {
        setIsSending(false);
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sending personalized SMS…",
      });
      const nextResults = await sendMessages(apiKey, senderId, messages);
      toast.style = nextResults.every((result) => result.accepted) ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = "Personalized SMS complete";
      setResults(nextResults);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to send SMS.";
      await showToast({
        style: Toast.Style.Failure,
        title: "Personalized SMS was not sent",
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
        placeholder="6addad95-f6c8-5929-8b5a-c8ef52067ea6"
        value={senderId}
        onChange={setSenderId}
        error={senderIdError}
      />
      <Form.TextArea
        id="messages"
        title="Recipients and Messages"
        placeholder={"255712345678 | Your verification code is 482901\n255713456789 | Your verification code is 102938"}
        info="Use one Tanzania phone number | message entry per line."
        error={messagesError}
      />
    </Form>
  );
}

function inputMessage(caught: unknown): string {
  return caught instanceof InputError ? caught.message : "Check this field.";
}

async function sendMessages(
  apiKey: string,
  senderId: string,
  messages: SmsMessage[],
): Promise<PersonalizedSmsResult[]> {
  const response = await sendBulk(apiKey, senderId, messages);
  return personalizedResults(messages, response);
}

function personalizedResults(messages: SmsMessage[], response: BulkSendResponse): PersonalizedSmsResult[] {
  return messages.map((message, index) => ({
    recipient: message.recipient,
    accepted: isAcceptedStatus(response.results[index]?.status),
    outcome: response.results[index]?.status ?? "Unknown",
    messageId: response.results[index]?.messageId,
  }));
}

function isAcceptedStatus(status: string | undefined): boolean {
  return Boolean(status && !["FAILED", "CANCELLED"].includes(status.toUpperCase()));
}