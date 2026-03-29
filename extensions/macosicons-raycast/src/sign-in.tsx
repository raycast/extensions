import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { authorizeWithOAuth, setApiKey } from "./api";

interface SignInProps {
  onSignIn: (apiKey: string) => void;
}

export default function SignIn({ onSignIn }: SignInProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleOAuth() {
    setIsLoading(true);
    try {
      const key = await authorizeWithOAuth();
      onSignIn(key);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authorization failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApiKey(values: { apiKey: string }) {
    const key = values.apiKey.trim();
    if (!key) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing API key",
        message: "Enter your API key or authorize with macOS Icons.",
      });
      return;
    }
    setIsLoading(true);
    try {
      await setApiKey(key);
      await showToast({ style: Toast.Style.Success, title: "API key saved" });
      onSignIn(key);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Authorize with macOS Icons" onAction={handleOAuth} />
          <Action.SubmitForm title="Use API Key" onSubmit={handleApiKey} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Sign In"
        text="Authorize with your macOS Icons account to get started."
      />
      <Form.Separator />
      <Form.Description
        title="Or Use an API Key Directly"
        text="If you already have an API key, enter it below instead."
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="Your macOSicons API key"
      />
    </Form>
  );
}
