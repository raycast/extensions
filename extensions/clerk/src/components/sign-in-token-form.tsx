import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";
import { parsePositiveIntOrUndefined } from "../lib/parse";
import { TokenResultDetail } from "./token-result";

export function SignInTokenForm({ app, userId }: { app: ClerkApp; userId: string }) {
  const { push } = useNavigation();
  const [expiresInSeconds, setExpiresInSeconds] = useState("3600");
  const [loading, setLoading] = useState(false);

  async function submit() {
    let expires: number;
    try {
      expires = parsePositiveIntOrUndefined(expiresInSeconds) ?? 3600;
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Expires in seconds must be a positive whole number" });
      return;
    }
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating sign-in token" });
    try {
      const t = await clientFor(app).signInTokens.createSignInToken({ userId, expiresInSeconds: expires });
      toast.style = Toast.Style.Success;
      toast.title = "Sign-in token created";
      push(
        <TokenResultDetail
          title="Sign-in Token"
          urlLabel="Sign-In URL"
          url={t.url}
          token={t.token}
          status={t.status}
        />,
      );
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
          <Action.SubmitForm title="Generate Sign-In Token" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="expiresInSeconds"
        title="Expires in Seconds"
        value={expiresInSeconds}
        onChange={setExpiresInSeconds}
      />
    </Form>
  );
}
