import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";

export function CreateUserForm({ app, onSaved }: { app: ClerkApp; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [email, setEmail] = useState("");
  const [skipPassword, setSkipPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Email is required" });
      return;
    }
    if (!skipPassword && !password) {
      await showToast({ style: Toast.Style.Failure, title: "Password is required (or enable Skip Password)" });
      return;
    }
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating user" });
    try {
      await clientFor(app).users.createUser({
        emailAddress: [email.trim()],
        password: skipPassword ? undefined : password,
        skipPasswordRequirement: skipPassword || undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        username: username.trim() || undefined,
      });
      toast.style = Toast.Style.Success;
      toast.title = "User created";
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
          <Action.SubmitForm title="Create User" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="email" title="Email" placeholder="user@example.com" value={email} onChange={setEmail} />
      <Form.Checkbox id="skipPassword" label="Skip password" value={skipPassword} onChange={setSkipPassword} />
      {!skipPassword && <Form.PasswordField id="password" title="Password" value={password} onChange={setPassword} />}
      <Form.TextField id="firstName" title="First Name" value={firstName} onChange={setFirstName} />
      <Form.TextField id="lastName" title="Last Name" value={lastName} onChange={setLastName} />
      <Form.TextField id="username" title="Username" value={username} onChange={setUsername} />
    </Form>
  );
}
