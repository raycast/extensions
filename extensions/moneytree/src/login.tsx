import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { login, logout, isAuthenticated } from "./lib/auth";

export default function Command() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const hasCheckedAuthRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate requests in React StrictMode
    if (hasCheckedAuthRef.current) {
      return;
    }
    hasCheckedAuthRef.current = true;

    async function checkAuth() {
      const isAuth = await isAuthenticated();
      console.debug(`[Login] Authentication check: ${isAuth}`);
      setAuthenticated(isAuth);
    }
    checkAuth();
  }, []);

  async function handleLogout() {
    try {
      await logout();
      // Verify logout was successful
      const isAuth = await isAuthenticated();
      if (isAuth) {
        throw new Error("Tokens were not cleared properly");
      }
      setAuthenticated(false);
      setEmail("");
      setPassword("");
      await showToast({
        style: Toast.Style.Success,
        title: "Logged out",
        message: "All authentication tokens have been cleared",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Logout failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleSubmit(values: { email: string; password: string }) {
    try {
      if (!values.email || !values.password) {
        throw new Error("Email and password are required");
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Logging in...",
        message: "Authenticating with Moneytree",
      });

      await login(values.email.trim(), values.password);
      setAuthenticated(true);
      setEmail("");
      setPassword("");

      await showToast({
        style: Toast.Style.Success,
        title: "Login successful",
        message: "Your Moneytree account is now connected",
      });

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Login failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {!authenticated ? (
            <Action.SubmitForm icon={Icon.Checkmark} title="Login" onSubmit={handleSubmit} />
          ) : (
            <Action icon={Icon.XMarkCircle} title="Logout" onAction={handleLogout} />
          )}
        </ActionPanel>
      }
    >
      {authenticated ? (
        <Form.Description title="🌱" text="You're already logged in" />
      ) : (
        <>
          <Form.Description title="🌱" text="Enter your Moneytree email and password to connect" />
          <Form.TextField
            id="email"
            title="Email"
            placeholder="your.email@example.com"
            value={email}
            onChange={setEmail}
            autoFocus
          />
          <Form.PasswordField
            id="password"
            title="Password"
            placeholder="your.password"
            value={password}
            onChange={setPassword}
          />
          <Form.Description
            title="🔒"
            text="Your Moneytree email and password are never stored after they're used. Only secure OAuth tokens are stored locally on your device with encryption."
          />
        </>
      )}
    </Form>
  );
}
