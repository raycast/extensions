import { ActionPanel, Action, Form, showHUD, popToRoot } from "@raycast/api";
import { useState } from "react";
import { setSession } from "./session";
import { API_BASE_URL } from "./constants";

export default function SignInCommand() {
  const [loading, setLoading] = useState(false);

  interface LoginResponse {
    access_token: string;
    refresh_token: string;
  }

  type User = Record<string, unknown>;

  interface Session {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number;
    user: User;
  }

  async function handleSubmit(values: { email: string; password: string }) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });

      console.log(res);

      if (!res.ok) throw new Error("Login failed");

      // Type the JSON response
      const data: LoginResponse = (await res.json()) as LoginResponse;

      if (data.access_token && data.refresh_token) {
        await setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_type: "bearer",
          expires_in: 3600, // Default to 1 hour if not provided by the API
          expires_at: Math.floor(Date.now() / 1000) + 3600, // Current time + 1 hour in seconds
          user: {},
        } as Session);

        await showHUD("✅ Signed in to PromptBee");
        popToRoot();
      } else {
        throw new Error("Invalid session data");
      }
    } catch (err) {
      console.error(err);
      await showHUD("❌ Sign in failed");
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
      <Form.TextField id="email" title="Email" placeholder="Enter your email" />
      <Form.PasswordField id="password" title="Password" placeholder="Enter your password" />
    </Form>
  );
}
