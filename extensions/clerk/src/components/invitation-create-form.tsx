import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";
import { parsePositiveIntOrUndefined } from "../lib/parse";

export function InvitationCreateForm({ app, onSaved }: { app: ClerkApp; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [email, setEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Email is required" });
      return;
    }
    let expires: number | undefined;
    try {
      expires = parsePositiveIntOrUndefined(expiresInDays);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Expires in days must be a positive whole number" });
      return;
    }
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating invitation" });
    try {
      await clientFor(app).invitations.createInvitation({
        emailAddress: email.trim(),
        expiresInDays: expires,
        redirectUrl: redirectUrl.trim() || undefined,
        notify,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Invitation created";
      onSaved();
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
          <Action.SubmitForm title="Create Invitation" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="email" title="Email" placeholder="user@example.com" value={email} onChange={setEmail} />
      <Form.TextField
        id="expiresInDays"
        title="Expires in Days"
        placeholder="optional"
        value={expiresInDays}
        onChange={setExpiresInDays}
      />
      <Form.TextField
        id="redirectUrl"
        title="Redirect URL"
        placeholder="optional"
        value={redirectUrl}
        onChange={setRedirectUrl}
      />
      <Form.Checkbox id="notify" label="Send invitation email" value={notify} onChange={setNotify} />
    </Form>
  );
}
