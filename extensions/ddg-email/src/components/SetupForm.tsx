import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getToastOptions } from "../lib/errors";
import { requestLoginLink } from "../lib/ddg-api";

type SetupFormValues = {
  username: string;
  otp: string;
};

type SetupFormProps = {
  defaultUsername?: string;
  onSubmit: (values: SetupFormValues) => Promise<void>;
};

export function SetupForm({ defaultUsername, onSubmit }: SetupFormProps) {
  const [username, setUsername] = useState(defaultUsername ?? "");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRequestPassphrase() {
    setIsLoading(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Requesting Passphrase",
      });
      await requestLoginLink(username);
      await showToast({
        style: Toast.Style.Success,
        title: "Passphrase Sent",
        message: "Check the email address linked to your Duck address.",
      });
    } catch (error) {
      await showToast(getToastOptions(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(values: SetupFormValues) {
    setIsLoading(true);

    try {
      await onSubmit(values);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Sign in and Generate Alias"
            onSubmit={handleSubmit}
          />
          <Action
            title="Send One-Time Passphrase"
            onAction={handleRequestPassphrase}
          />
          <Action.OpenInBrowser
            title="Open DuckDuckGo Email Setup"
            url="https://duckduckgo.com/email/start"
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="username"
        title="Duck Address"
        placeholder="username"
        value={username}
        onChange={setUsername}
        info="Enter your main Duck address without @duck.com."
      />
      <Form.PasswordField
        id="otp"
        title="One-Time Passphrase"
        placeholder="four word passphrase"
        value={otp}
        onChange={setOtp}
        info="Request a passphrase first, then paste the passphrase DuckDuckGo sends you."
      />
    </Form>
  );
}
