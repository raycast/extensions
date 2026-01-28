import { Form, ActionPanel, Action, showToast, Toast, Icon, open } from "@raycast/api";
import { useState } from "react";
import { verifyAndSaveToken, AuthenticationError } from "../utils/auth";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../utils/types";
import { logger } from "../utils/logger";

interface LoginFormProps {
  onLogin: () => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const showFailureToast = (message: string) => {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message,
    });
  };

  const handleLogin = async () => {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      showFailureToast(ERROR_MESSAGES.EMPTY_INPUT);
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Connecting...",
      message: "Verifying your token...",
    });

    try {
      const authResponse = await verifyAndSaveToken(trimmedToken);

      if (!authResponse.isValid) {
        throw new AuthenticationError("Authentication failed", "AUTH_FAILED");
      }

      toast.style = Toast.Style.Success;
      toast.title = SUCCESS_MESSAGES.AUTH_SUCCESS;
      toast.message = authResponse.name ? `Welcome back, ${authResponse.name}!` : undefined;

      // Clear the form
      setToken("");

      // Call the onLogin callback
      onLogin();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";

      if (error instanceof AuthenticationError) {
        switch (error.code) {
          case "INVALID_TOKEN":
            toast.message = ERROR_MESSAGES.INVALID_TOKEN;
            break;
          case "NETWORK_ERROR":
            toast.message = ERROR_MESSAGES.NETWORK_ERROR;
            break;
          case "AUTH_FAILED":
            toast.message = "Invalid API token. Please check your token and try again.";
            break;
          default:
            toast.message = error.message;
        }
      } else {
        toast.message = ERROR_MESSAGES.UNKNOWN_ERROR;
        logger.error("Unexpected login error", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openApiDocs = async () => {
    try {
      await open("https://app.rewiser.io");
    } catch (error) {
      logger.error("Failed to open API documentation", error);
      showFailureToast("Failed to open profile page");
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Rewiser — Manage Your Finances"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" icon={Icon.Plug} onSubmit={handleLogin} />
          <ActionPanel.Section>
            <Action
              title="Get Api Token"
              icon={Icon.Key}
              onAction={openApiDocs}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="Welcome to Rewiser"
        text="Connect your Rewiser account to manage transactions directly from Raycast."
      />

      <Form.Separator />

      <Form.Description text="To get started:" />

      <Form.Description text="1. Open the Rewiser web application" />

      <Form.Description text="2. Go to your Profile → API Keys section" />

      <Form.Description text="3. Create a new Personal Access Token" />

      <Form.Description text="4. Enter the token below" />

      <Form.Separator />

      <Form.PasswordField
        id="token"
        title="Personal Access Token"
        placeholder="Enter your API token from Rewiser"
        value={token}
        onChange={setToken}
        error={!token.trim() && token.length > 0 ? "Token cannot be empty" : undefined}
      />

      <Form.Separator />

      <Form.Description text="Your token is stored securely and only used to communicate with Rewiser's API." />
    </Form>
  );
}
