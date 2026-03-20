import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { sendMessage, replyToMessage, Message } from "./utils/m365";

interface ComposeProps {
  replyTo?: Message;
}

export default function ComposeView({ replyTo }: ComposeProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const isReply = !!replyTo;
  const replyToName = replyTo?.from?.emailAddress?.name ?? replyTo?.from?.emailAddress?.address ?? "";
  const replyToDate = replyTo ? new Date(replyTo.receivedDateTime).toLocaleString() : "";

  async function handleSend(values: { to?: string; subject?: string; body: string }) {
    if (!isReply) {
      if (!values.to?.trim()) {
        showToast({ title: "Recipient required", style: Toast.Style.Failure });
        return;
      }
      if (!values.subject?.trim()) {
        showToast({ title: "Subject required", style: Toast.Style.Failure });
        return;
      }
    }
    setIsLoading(true);
    try {
      if (isReply) {
        await replyToMessage(replyTo!.id, values.body ?? "");
      } else {
        await sendMessage(values.to!.trim(), values.subject!.trim(), values.body ?? "");
      }
      showToast({ title: "Email sent!", style: Toast.Style.Success });
      pop();
    } catch (err) {
      showToast({ title: "Failed to send", description: String(err), style: Toast.Style.Failure });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isReply ? `Re: ${replyTo?.subject ?? ""}` : "New Email"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.ChevronRight} onSubmit={handleSend} />
        </ActionPanel>
      }
    >
      {isReply ? (
        <Form.Description title="To" text={replyToName} />
      ) : (
        <>
          <Form.TextField id="to" title="To" placeholder="recipient@example.com" />
          <Form.TextField id="subject" title="Subject" placeholder="Subject" />
        </>
      )}
      <Form.TextArea id="body" title="Message" placeholder="Write your message here..." enableMarkdown={false} />
      {isReply && (
        <>
          <Form.Separator />
          <Form.Description
            title="Original Message"
            text={`From: ${replyToName}\nSent: ${replyToDate}\nSubject: ${replyTo?.subject ?? ""}\n\n${replyTo?.bodyPreview ?? ""}`}
          />
        </>
      )}
    </Form>
  );
}
