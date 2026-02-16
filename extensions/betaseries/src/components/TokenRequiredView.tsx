import {
  Action,
  ActionPanel,
  Form,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { authenticateMember, saveToken } from "../api/client";

type TokenRequiredViewProps = {
  onTokenSaved?: (token: string) => Promise<void>;
};

export function TokenRequiredView({ onTokenSaved }: TokenRequiredViewProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { login: string; password: string }) => {
    try {
      setIsLoading(true);
      await showToast({
        style: Toast.Style.Animated,
        title: "Authenticating...",
      });

      const token = await authenticateMember(values.login, values.password);

      if (onTokenSaved) {
        await onTokenSaved(token);
      } else {
        await saveToken(token);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Connected",
        message: "Your BetaSeries token has been saved.",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Connect to Betaseries"
            onSubmit={handleSubmit}
          />
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Sign in with your BetaSeries credentials to generate and save your auth token automatically." />
      <Form.TextField
        id="login"
        title="Login or Email"
        placeholder="username"
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Your BetaSeries password"
      />
    </Form>
  );
}
