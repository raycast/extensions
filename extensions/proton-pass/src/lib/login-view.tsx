import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { BrowserLoginStatus } from "./core/login";
import { cancelBrowserLogin, checkBrowserLogin, startBrowserLogin } from "./pass-cli";
import { platformShortcut } from "./shortcuts";
import { openTerminalForLogin } from "./terminal";
import { PassCliError, PROTON_PASS_CLI_DOCS } from "./types";

/** How often a view waiting for the browser login checks on it. */
const LOGIN_CHECK_INTERVAL_MS = 1_000;

type LoginStatus = BrowserLoginStatus | { state: "starting" };
export type BrowserLogin = ReturnType<typeof useBrowserLogin>;

function asPassCliError(error: unknown): PassCliError {
  if (error instanceof PassCliError) return error;
  return new PassCliError(error instanceof Error ? error.message : String(error), "unknown");
}

/**
 * Browser login that completes even when Raycast closes meanwhile: a view opened while it runs waits for it too.
 * `onLoggedIn` runs once it succeeded.
 */
export function useBrowserLogin(onLoggedIn: () => void) {
  const [status, setStatus] = useState<LoginStatus>({ state: "none" });
  const isChecking = useRef(false);

  async function check() {
    if (isChecking.current) return;
    isChecking.current = true;
    try {
      const next = await checkBrowserLogin();
      setStatus(next);
      if (next.state === "succeeded") {
        void showToast({ style: Toast.Style.Success, title: "Logged In" });
        onLoggedIn();
      }
    } catch (error) {
      setStatus({ state: "failed", error: asPassCliError(error) });
    } finally {
      isChecking.current = false;
    }
  }

  // Picks up a login started before Raycast closed.
  useEffect(() => {
    void check();
  }, []);

  useEffect(() => {
    if (status.state !== "waiting") return;
    const timer = setInterval(() => void check(), LOGIN_CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status.state]);

  async function start() {
    setStatus({ state: "starting" });
    try {
      const url = await startBrowserLogin();
      if (url) {
        setStatus({ state: "waiting", url });
      } else {
        setStatus({ state: "none" });
        onLoggedIn();
      }
    } catch (error) {
      setStatus({ state: "failed", error: asPassCliError(error) });
    }
  }

  async function cancel() {
    await cancelBrowserLogin();
    setStatus({ state: "none" });
  }

  return { status, start, cancel };
}

interface LoginScreenProps {
  login: BrowserLogin;
  /** Loads again, e.g. once a login done elsewhere has completed. */
  onCheckAgain: () => void;
}

/** The Not Logged In screen, or, once a browser login has started, what's left to do to finish it. */
export function LoginScreen({ login, onCheckAgain }: LoginScreenProps) {
  const { status } = login;
  const checkAgain = (
    <Action
      title="Check Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onCheckAgain}
    />
  );

  if (status.state === "starting" || status.state === "waiting") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Hourglass}
          title={status.state === "starting" ? "Opening the Login Page" : "Finish Logging In in Your Browser"}
          description="You can close Raycast meanwhile: the login keeps going, and the extension picks it up when you come back."
          actions={
            <ActionPanel>
              {status.state === "waiting" && (
                <Action.OpenInBrowser title="Open Login Page Again" url={status.url} icon={Icon.Globe} />
              )}
              {checkAgain}
              <Action
                title="Cancel Login"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                onAction={login.cancel}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const failure = status.state === "failed" ? status.error.message : undefined;
  return (
    <List>
      <List.EmptyView
        icon={Icon.Lock}
        title={failure ? "Login Didn't Complete" : "Not Logged In"}
        description={
          failure ??
          (process.platform === "darwin"
            ? "Use browser login (default pass-cli flow). Terminal login remains available as a fallback."
            : "Use browser login to authenticate with Proton Pass.")
        }
        actions={
          <ActionPanel>
            <Action title="Login with Browser" icon={Icon.Globe} onAction={login.start} />
            {process.platform === "darwin" && (
              <Action
                title="Open Terminal Login (Fallback)"
                icon={Icon.Terminal}
                onAction={openTerminalForLogin}
                shortcut={platformShortcut(["cmd"], "t")}
              />
            )}
            <Action.OpenInBrowser
              title="View CLI Documentation"
              url={PROTON_PASS_CLI_DOCS}
              icon={Icon.Globe}
              shortcut={platformShortcut(["cmd"], "d")}
            />
            {checkAgain}
          </ActionPanel>
        }
      />
    </List>
  );
}

/** Not Logged In screen of the commands that load items: `reload` runs once logged in, and for Check Again. */
export function NotLoggedInView({ reload }: { reload: () => void }) {
  const login = useBrowserLogin(reload);
  return <LoginScreen login={login} onCheckAgain={reload} />;
}
