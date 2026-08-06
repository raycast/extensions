import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";

export function AddEmailForm({ app, userId, onAdded }: { app: ClerkApp; userId: string; onAdded: () => void }) {
  const { pop } = useNavigation();
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(true);
  const [primary, setPrimary] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Email is required" });
      return;
    }
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding email address" });
    try {
      await clientFor(app).emailAddresses.createEmailAddress({
        userId,
        emailAddress: email.trim(),
        verified,
        primary,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Email added";
      onAdded();
      pop();
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Email Address" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="email" title="Email" placeholder="user@example.com" value={email} onChange={setEmail} />
      <Form.Checkbox id="verified" label="Mark as verified" value={verified} onChange={setVerified} />
      <Form.Checkbox id="primary" label="Set as primary" value={primary} onChange={setPrimary} />
    </Form>
  );
}
