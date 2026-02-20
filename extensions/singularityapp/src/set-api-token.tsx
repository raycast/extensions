import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, popToRoot } from "@raycast/api";
import { useState } from "react";
import { API_TOKEN_KEY } from "./api";

export default function Command() {
  const [token, setToken] = useState("");

  async function handleSubmit() {
    if (!token.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Token Required",
        message: "Please enter an API token",
      });
      return;
    }

    try {
      await LocalStorage.setItem(API_TOKEN_KEY, token.trim());
      await showToast({
        style: Toast.Style.Success,
        title: "API Token Saved",
        message: "Your API token has been saved successfully",
      });
      await popToRoot();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to save API token",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Token" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your SingularityApp API token to use with other commands." />
      <Form.PasswordField
        id="token"
        title="API Token"
        placeholder="Enter your API token"
        value={token}
        onChange={setToken}
      />
    </Form>
  );
}
