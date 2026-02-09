/**
 * Login command for authenticating with Odoo
 */

import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { login, OdooClient } from "./utils/odoo";
import { ensureInitialized } from "./init";

interface LoginFormValues {
  baseUrl: string;
  username: string;
  password: string;
}

export default function LoginCommand() {
  ensureInitialized();

  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();

  async function handleSubmit(values: LoginFormValues) {
    // Validate URL format
    const normalizedUrl = OdooClient.normalizeUrl(values.baseUrl);
    if (!OdooClient.isValidUrl(normalizedUrl)) {
      setUrlError("Invalid URL format. Please enter a valid Odoo URL.");
      return;
    }

    setUrlError(undefined);
    setIsLoading(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Logging in...",
      });

      await login(values.baseUrl, values.username, values.password);

      await showToast({
        style: Toast.Style.Success,
        title: "Login Successful",
        message: "You are now connected to Odoo",
      });

      // Close the login form
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Login Failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Login" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your Odoo credentials to connect" />
      <Form.TextField
        id="baseUrl"
        title="Odoo URL"
        placeholder="https://your-company.odoo.com"
        error={urlError}
        onChange={() => setUrlError(undefined)}
        info="The URL of your Odoo instance (e.g., https://your-company.odoo.com)"
      />
      <Form.TextField
        id="username"
        title="Username"
        placeholder="user@example.com"
        info="Your Odoo username (usually your email address)"
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Enter your password"
        info="Your Odoo account password"
      />
    </Form>
  );
}
