import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { notificationAction, Notification } from "./utils/applescript";
import React, { useState } from "react";

interface ReplyNotificationProps {
  notification: Notification;
  actionName: string;
  onSuccess: () => void;
}

export default function ReplyNotification({ notification, actionName, onSuccess }: ReplyNotificationProps) {
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!replyText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reply Required",
        message: "Please enter a reply message",
      });
      return;
    }

    if (!notification.id) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Send Reply",
        message: "Notification ID not available",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await notificationAction(notification.id, actionName, replyText);

      if (typeof response === "string") {
        // Error message
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Send Reply",
          message: response,
        });
      } else if (response.status === "success") {
        await showToast({
          style: Toast.Style.Success,
          title: "Reply Sent",
          message: response.message,
        });
        onSuccess();
        await popToRoot();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed",
          message: response.message,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Send Reply",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Reply" onSubmit={handleSubmit} icon="💬" />
        </ActionPanel>
      }
    >
      <Form.Description title="Reply To" text={`${notification.app} • ${notification.title || "No Title"}`} />
      <Form.Description title="Message" text={notification.body} />
      <Form.TextArea
        id="replyText"
        title="Your Reply"
        placeholder="Type your reply here..."
        value={replyText}
        onChange={setReplyText}
        autoFocus
      />
    </Form>
  );
}
