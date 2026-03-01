import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { checkAuth, loginWithBrowser } from "./lib/pass-cli";
import { PassCliError, PROTON_PASS_CLI_DOCS } from "./lib/types";
import { openTerminalForLogin } from "./lib/terminal";

type AuthState = "loading" | "not-installed" | "not-authenticated" | "authenticated";

export default function Command() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    async function verifyAuth() {
      try {
        const isAuthenticated = await checkAuth();
        setAuthState(isAuthenticated ? "authenticated" : "not-authenticated");
      } catch (error) {
        if (error instanceof PassCliError) {
          if (error.type === "not_installed") {
            setAuthState("not-installed");
            return;
          }
          if (error.type === "not_authenticated") {
            setAuthState("not-authenticated");
            return;
          }
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Error checking authentication status",
          message: error instanceof Error ? error.message : String(error),
        });
        setAuthState("not-authenticated");
      }
    }

    verifyAuth();
  }, []);

  async function handleBrowserLogin() {
    setIsLoggingIn(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Proton Pass login",
      message: "Complete authentication in your browser",
    });

    try {
      await loginWithBrowser();
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        throw new PassCliError("Login did not complete. Please try again.", "not_authenticated");
      }
      setAuthState("authenticated");
      toast.style = Toast.Style.Success;
      toast.title = "Logged in";
      toast.message = "Proton Pass session is active";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Login failed";
      toast.message = message;
      setAuthState("not-authenticated");
    } finally {
      setIsLoggingIn(false);
    }
  }

  if (authState === "loading" || isLoggingIn) {
    return <List isLoading={true} />;
  }

  if (authState === "not-installed") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Proton Pass CLI Not Installed"
          description="You need to install the Proton Pass CLI to use this extension. Click below to learn how to install it."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Installation Guide" url={PROTON_PASS_CLI_DOCS} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (authState === "not-authenticated") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="Not Logged In"
          description="Use browser login (default pass-cli flow). Terminal login remains available as a fallback."
          actions={
            <ActionPanel>
              <Action title="Login with Browser" icon={Icon.Globe} onAction={handleBrowserLogin} />
              <Action
                title="Open Terminal Login (Fallback)"
                icon={Icon.Terminal}
                onAction={openTerminalForLogin}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action.OpenInBrowser
                title="View CLI Documentation"
                url={PROTON_PASS_CLI_DOCS}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List>
      <List.EmptyView
        icon={Icon.CheckCircle}
        title="You're Logged In"
        description="You are successfully authenticated with Proton Pass. You can now use other commands to search and manage your vaults."
        actions={
          <ActionPanel>
            <Action title="Re-Run Browser Login" icon={Icon.Globe} onAction={handleBrowserLogin} />
            <Action.OpenInBrowser
              title="View CLI Documentation"
              url={PROTON_PASS_CLI_DOCS}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
