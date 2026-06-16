import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { User } from "@clerk/backend";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";
import { parseMetadata, stringifyMetadata } from "../lib/metadata";
import { AddEmailForm } from "./add-email-form";

export function EditUserForm({ app, user, onSaved }: { app: ClerkApp; user: User; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [primaryEmailId, setPrimaryEmailId] = useState(user.primaryEmailAddressId ?? "");
  const [publicMeta, setPublicMeta] = useState(stringifyMetadata(user.publicMetadata));
  const [privateMeta, setPrivateMeta] = useState(stringifyMetadata(user.privateMetadata));
  const [loading, setLoading] = useState(false);

  async function submit() {
    let publicMetadata: Record<string, unknown>;
    let privateMetadata: Record<string, unknown>;
    try {
      publicMetadata = parseMetadata(publicMeta);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Invalid JSON in public metadata" });
      return;
    }
    try {
      privateMetadata = parseMetadata(privateMeta);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Invalid JSON in private metadata" });
      return;
    }
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating user" });
    try {
      await clientFor(app).users.updateUser(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim() || undefined,
        primaryEmailAddressID: primaryEmailId || undefined,
      });
      await clientFor(app).users.replaceUserMetadata(user.id, { publicMetadata, privateMetadata });
      toast.style = Toast.Style.Success;
      toast.title = "User updated";
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
          <Action.SubmitForm title="Save User" onSubmit={submit} />
          <Action.Push
            title="Add Email Address"
            icon={Icon.Envelope}
            target={<AddEmailForm app={app} userId={user.id} onAdded={onSaved} />}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="firstName" title="First Name" value={firstName} onChange={setFirstName} />
      <Form.TextField id="lastName" title="Last Name" value={lastName} onChange={setLastName} />
      <Form.TextField id="username" title="Username" value={username} onChange={setUsername} />
      {user.emailAddresses.length > 0 && (
        <Form.Dropdown id="primaryEmail" title="Primary Email" value={primaryEmailId} onChange={setPrimaryEmailId}>
          {user.emailAddresses.map((e) => (
            <Form.Dropdown.Item key={e.id} value={e.id} title={e.emailAddress} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea id="publicMeta" title="Public Metadata (JSON)" value={publicMeta} onChange={setPublicMeta} />
      <Form.TextArea id="privateMeta" title="Private Metadata (JSON)" value={privateMeta} onChange={setPrivateMeta} />
    </Form>
  );
}
