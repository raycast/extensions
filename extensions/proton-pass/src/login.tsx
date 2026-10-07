import { List, ActionPanel, Action, Alert, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { checkAuth, logout } from "./lib/pass-cli";
import { PassCliError, PROTON_PASS_CLI_DOCS } from "./lib/types";
import { LoginScreen, useBrowserLogin } from "./lib/login-view";
import { platformShortcut } from "./lib/shortcuts";

type AuthState = "loading" | "not-installed" | "not-authenticated" | "authenticated";

export default function Command() {
  const [authState, setAuthState] = useState<AuthState>("loading");

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

  function checkAgain() {
    setAuthState("loading");
    void verifyAuth();
  }

  const login = useBrowserLogin(checkAgain);

  async function logOut(force = false) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Logging Out" });
    try {
      await logout(force);
      toast.style = Toast.Style.Success;
      toast.title = "Logged Out";
      setAuthState("not-authenticated");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't Log Out";
      toast.message = error instanceof Error ? error.message : String(error);
      // Ending the session on Proton's servers can fail, e.g. offline: removing it from this computer still works.
      if (!force) toast.primaryAction = { title: "Force Logout", onAction: () => void logOut(true) };
    }
  }

  async function confirmLogOut() {
    const confirmed = await confirmAlert({
      title: "Log Out of Proton Pass?",
      message: "pass-cli shares the session with the terminal, so it will need a new login there too.",
      primaryAction: { title: "Log Out", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await logOut();
  }

  useEffect(() => {
    verifyAuth();
  }, []);

  // A login in progress comes first, also one started from the logged-in screen to log in again.
  if (login.status.state === "waiting") {
    return <LoginScreen login={login} onCheckAgain={checkAgain} />;
  }

  if (authState === "loading") {
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
    return <LoginScreen login={login} onCheckAgain={checkAgain} />;
  }

  return (
    <List>
      <List.EmptyView
        icon={Icon.CheckCircle}
        title="You're Logged In"
        description={
          login.status.state === "failed"
            ? `Your session is still active, but the new login didn't complete: ${login.status.error.message}`
            : "You are successfully authenticated with Proton Pass. You can now use other commands to search and manage your vaults."
        }
        actions={
          <ActionPanel>
            <Action title="Re-Run Browser Login" icon={Icon.Globe} onAction={login.start} />
            <Action title="Logout" icon={Icon.Logout} style={Action.Style.Destructive} onAction={confirmLogOut} />
            <Action.OpenInBrowser
              title="View CLI Documentation"
              url={PROTON_PASS_CLI_DOCS}
              icon={Icon.Globe}
              shortcut={platformShortcut(["cmd"], "d")}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
