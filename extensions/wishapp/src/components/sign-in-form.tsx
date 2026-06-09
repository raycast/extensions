import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { signIn } from "../lib/auth";

type Props = { onSignedIn: () => void };

export function SignInForm({ onSignedIn }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { email: string; password: string }) {
    if (!values.email || !values.password) {
      await showToast({ style: Toast.Style.Failure, title: "Enter email and password" });
      return;
    }
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      await showToast({ style: Toast.Style.Success, title: "Signed in" });
      onSignedIn();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sign-in failed",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sign in" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Sign in with your WishApp email and password." />
      <Form.Description text="Signed up with Google or Apple? Use 'Forgot password' at getwish.app to set one." />
      <Form.TextField id="email" title="Email" placeholder="you@example.com" />
      <Form.PasswordField id="password" title="Password" />
    </Form>
  );
}
