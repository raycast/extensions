import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";
import { parsePositiveIntOrUndefined } from "../lib/parse";
import { ROLE_PRESETS } from "../lib/roles";

export function OrgInvitationCreateForm({
  app,
  organizationId,
  onSaved,
}: {
  app: ClerkApp;
  organizationId: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("org:member");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Email is required" });
      return;
    }
    if (!role.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Role is required" });
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
      await clientFor(app).organizations.createOrganizationInvitation({
        organizationId,
        emailAddress: email.trim(),
        role: role.trim(),
        expiresInDays: expires,
        redirectUrl: redirectUrl.trim() || undefined,
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
      <Form.Dropdown id="rolePreset" title="Common Roles" value={role} onChange={setRole}>
        {!ROLE_PRESETS.includes(role) && (
          <Form.Dropdown.Item value={role} title={role.trim() ? `${role} (custom)` : "Select a role…"} />
        )}
        {ROLE_PRESETS.map((preset) => (
          <Form.Dropdown.Item key={preset} value={preset} title={preset} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="role" title="Role (custom allowed)" value={role} onChange={setRole} />
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
    </Form>
  );
}
