/**
 * Send Feedback command - native form that posts to /api/v1/feedback
 */

import { useEffect, useRef, useState } from "react";
import {
  ActionPanel,
  Action,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  popToRoot,
  showToast,
} from "@raycast/api";
import { submitFeedback, FeedbackType } from "./lib/api";
import { getStoredAuth } from "./lib/auth";

const FEEDBACK_TYPES: { value: FeedbackType; title: string; icon: Icon }[] = [
  { value: "bug", title: "Bug Report", icon: Icon.Bug },
  { value: "feature", title: "Feature Request", icon: Icon.Stars },
  { value: "general", title: "General Feedback", icon: Icon.SpeechBubble },
  { value: "praise", title: "Praise", icon: Icon.Heart },
  { value: "complaint", title: "Complaint", icon: Icon.ExclamationMark },
];

export default function SendFeedback() {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [messageError, setMessageError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const isSubmitting = useRef(false);

  useEffect(() => {
    getStoredAuth().then((auth) => {
      if (auth?.userEmail) setEmail(auth.userEmail);
    });
  }, []);

  function validateMessage(value: string): boolean {
    if (value.trim().length < 10) {
      setMessageError("Please write at least 10 characters");
      return false;
    }
    setMessageError(undefined);
    return true;
  }

  function validateEmail(value: string): boolean {
    if (!value) {
      setEmailError(undefined);
      return true;
    }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setEmailError(valid ? undefined : "Enter a valid email or leave blank");
    return valid;
  }

  async function handleSubmit() {
    if (isSubmitting.current) return;

    const messageOk = validateMessage(message);
    const emailOk = validateEmail(email);
    if (!messageOk || !emailOk) return;

    isSubmitting.current = true;
    setIsLoading(true);

    try {
      await submitFeedback({
        feedback_type: feedbackType,
        message: message.trim(),
        user_email: email.trim() || undefined,
        user_agent: "Raycast Cleyo Extension",
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Feedback sent",
        message: "Thanks — we read every message",
      });

      await closeMainWindow();
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to send feedback",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Feedback"
            icon={Icon.Envelope}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Report a bug, request a feature, or share feedback. Goes straight to the Cleyo team." />

      <Form.Dropdown
        id="feedback_type"
        title="Type"
        value={feedbackType}
        onChange={(value) => setFeedbackType(value as FeedbackType)}
      >
        {FEEDBACK_TYPES.map((t) => (
          <Form.Dropdown.Item
            key={t.value}
            value={t.value}
            title={t.title}
            icon={t.icon}
          />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Describe what happened, what you'd like, or what's on your mind…"
        value={message}
        error={messageError}
        onChange={(value) => {
          setMessage(value);
          if (messageError) validateMessage(value);
        }}
        onBlur={(event) => validateMessage(event.target.value ?? "")}
        autoFocus
      />

      <Form.TextField
        id="email"
        title="Email (optional)"
        placeholder="so we can follow up"
        value={email}
        error={emailError}
        onChange={(value) => {
          setEmail(value);
          if (emailError) validateEmail(value);
        }}
        onBlur={(event) => validateEmail(event.target.value ?? "")}
      />
    </Form>
  );
}
