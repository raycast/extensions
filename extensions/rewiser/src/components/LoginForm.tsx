import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, Icon, open } from "@raycast/api";
import { useState } from "react";
import { saveToken } from "../utils/auth";

interface LoginFormProps {
  onLogin: () => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!token.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Enter your API token",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Connecting...",
    });

    try {
      const response = await fetch("https://nzkqapsaeatytqrnitpj.supabase.co/functions/v1/verify-auth", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Invalid token");
      }

      const user = (await response.json()) as { name?: string };

      await saveToken(token);
      await LocalStorage.setItem("rewiser_user_name", user.name || "");

      toast.style = Toast.Style.Success;
      toast.title = "Connected";

      onLogin();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = String(error);
    } finally {
      setIsLoading(false);
    }
  };

  const openRewiserWeb = () => {
    open("https://app.rewiser.io");
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Rewiser — Manage Your Finances"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" onSubmit={handleLogin} />
          <Action title="Open Rewiser Web" icon={Icon.Globe} onAction={openRewiserWeb} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Rewiser Login"
        text="First, log in to the Rewiser Web application. From your profile menu, open the 'API Keys' section, create a new key, and enter it below.
        "
      />
      <Form.Separator />
      <Form.PasswordField
        id="token"
        title="Token"
        placeholder="Enter your Personal access token"
        value={token}
        onChange={setToken}
      />
    </Form>
  );
}
