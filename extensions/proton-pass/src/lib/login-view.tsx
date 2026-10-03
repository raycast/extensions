import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { loginWithBrowser } from "./pass-cli";
import { platformShortcut } from "./shortcuts";
import { openTerminalForLogin } from "./terminal";
import { PROTON_PASS_CLI_DOCS } from "./types";

export async function loginWithBrowserAndReload(reload: () => Promise<void>) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting Proton Pass login",
    message: "Complete authentication in your browser",
  });

  try {
    await loginWithBrowser();
    toast.style = Toast.Style.Success;
    toast.title = "Logged in";
    toast.message = "Reloading";
    await reload();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to login";
    toast.style = Toast.Style.Failure;
    toast.title = "Login failed";
    toast.message = message;
  }
}

interface NotLoggedInViewProps {
  onLogin: () => void;
  /** Loads again, e.g. once a login started elsewhere has completed. */
  onCheckAgain: () => void;
}

/** Shown when the session has ended, with a way to log in again. */
export function NotLoggedInView({ onLogin, onCheckAgain }: NotLoggedInViewProps) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Lock}
        title="Not Logged In"
        description={
          process.platform === "darwin"
            ? "Use browser login (default pass-cli flow). Terminal login remains available as a fallback."
            : "Use browser login to authenticate with Proton Pass."
        }
        actions={
          <ActionPanel>
            <Action title="Login with Browser" icon={Icon.Globe} onAction={onLogin} />
            <Action
              title="Check Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onCheckAgain}
            />
            {process.platform === "darwin" && (
              <Action title="Open Terminal Login (Fallback)" icon={Icon.Terminal} onAction={openTerminalForLogin} />
            )}
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
