import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { addAccount } from "./accounts";

/** In-app GUI sign-in: guides the user to wandb.ai/authorize, validates the
 *  pasted key against the API, then stores it as an account. Used both for the
 *  first sign-in and for adding additional accounts. */
export function AuthForm({ onDone }: { onDone: () => void | Promise<void> }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(values: { apiKey: string }) {
    const key = values.apiKey.trim();
    if (!key) {
      setError("API key is required");
      return;
    }
    setIsLoading(true);
    try {
      const account = await addAccount(key); // validates + persists
      await showToast({ style: Toast.Style.Success, title: `Added @${account.username}` });
      await onDone();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication failed",
        message: e instanceof Error ? e.message : String(e),
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
          <Action.SubmitForm title="Sign in" icon={Icon.Key} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Get API Key" icon={Icon.Globe} url="https://wandb.ai/authorize" />
        </ActionPanel>
      }
    >
      <Form.Description text="Connect a Weights & Biases account. Open the authorize page to copy that account's API key, paste it below, then Sign In. You can add several accounts." />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="Paste your W&B API key"
        error={error}
        onChange={() => error && setError(undefined)}
      />
    </Form>
  );
}
