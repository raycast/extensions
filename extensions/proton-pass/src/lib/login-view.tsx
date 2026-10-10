import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { BrowserLoginStatus } from "./core/login";
import { cancelBrowserLogin, checkBrowserLogin, startBrowserLogin } from "./pass-cli";
import { platformShortcut } from "./shortcuts";
import { openTerminalForLogin } from "./terminal";
import { PassCliError, PROTON_PASS_CLI_DOCS } from "./types";

/** How often a view waiting for the browser login checks on it. */
const LOGIN_CHECK_INTERVAL_MS = 1_000;

/** `checking` until the view knows whether a login started before is still running. */
type LoginStatus = BrowserLoginStatus | { state: "checking" };
export type BrowserLogin = ReturnType<typeof useBrowserLogin>;

function asPassCliError(error: unknown): PassCliError {
  if (error instanceof PassCliError) return error;
  return new PassCliError(error instanceof Error ? error.message : String(error), "unknown");
}

/**
 * Browser login that completes even when Raycast closes meanwhile: a view opened while it runs waits for it too.
 * `onLoggedIn` runs once it succeeded.
 */
export function useBrowserLogin(onLoggedIn: () => void | Promise<void>) {
  const [status, setStatus] = useState<LoginStatus>({ state: "checking" });
  /** The check in flight, if any. */
  const checking = useRef<Promise<void> | undefined>(undefined);
  /** Whether a login is being started or canceled. */
  const isChanging = useRef(false);

  function check(): Promise<void> {
    // A login being started or canceled reports itself: a check meanwhile would report the login before it, or put
    // the canceled one back on screen.
    if (isChanging.current) return Promise.resolve();
    checking.current ??= readStatus().finally(() => {
      checking.current = undefined;
    });
    return checking.current;
  }

  async function readStatus() {
    try {
      const next = await checkBrowserLogin();
      setStatus(next);
      if (next.state === "succeeded") {
        void showToast({ style: Toast.Style.Success, title: "Logged In" });
        // "You're Logged In" shows while the view loads. A view still showing the login screen once loaded isn't
        // logged in after all, and gets its actions back.
        await onLoggedIn();
        setStatus({ state: "none" });
      }
    } catch (error) {
      setStatus({ state: "failed", error: asPassCliError(error) });
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

  /**
   * The screen stays as it is until the browser is in front, which closes Raycast: switching screens before would
   * flash two screens just as Raycast closes.
   */
  async function start() {
    if (isChanging.current) return;
    isChanging.current = true;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Opening the Login Page" });
    try {
      // A check in flight is about the login before this one: left to finish, or it would remove this login's files
      // and report its own result over this login's.
      await checking.current;
      const url = await startBrowserLogin();
      void toast.hide();
      if (url) {
        setStatus({ state: "waiting", url, isFinishing: false });
      } else {
        setStatus({ state: "none" });
        onLoggedIn();
      }
    } catch (error) {
      const failure = asPassCliError(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't Start the Login";
      toast.message = failure.message;
      setStatus({ state: "failed", error: failure });
    } finally {
      isChanging.current = false;
    }
  }

  async function cancel() {
    if (isChanging.current) return;
    isChanging.current = true;
    try {
      // As in start(), the check in flight finishes first.
      await checking.current;
      await cancelBrowserLogin();
      setStatus({ state: "none" });
    } finally {
      isChanging.current = false;
    }
  }

  /** Back to the Not Logged In screen, e.g. after logging out. */
  function reset() {
    setStatus({ state: "none" });
  }

  return { status, start, cancel, reset };
}

interface LoginScreenProps {
  login: BrowserLogin;
  /** Loads again, e.g. once a login done elsewhere has completed. */
  onCheckAgain: () => void;
}

/**
 * The Not Logged In screen, then where the browser login is: waiting for the browser, saving the session, and, once
 * logged in, while the view loads. Raycast never shows an empty view while its list is loading, so these screens say
 * what's happening rather than spin.
 */
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

  if (status.state === "checking") return <List isLoading />;

  if (status.state === "succeeded") {
    return (
      <List>
        <List.EmptyView icon={Icon.CheckCircle} title="You're Logged In" description="Loading your items…" />
      </List>
    );
  }

  if (status.state === "waiting") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Hourglass}
          title={status.isFinishing ? "Finishing the Login" : "Log In in Your Browser"}
          description={
            status.isFinishing
              ? "pass-cli is saving your session. This takes a few seconds."
              : "Use the page that opened in your browser. Once you're logged in there, this continues by itself within about 10 seconds, even if Raycast closes meanwhile."
          }
          actions={
            <ActionPanel>
              {status.url && !status.isFinishing && (
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

/**
 * Not Logged In screen of the commands that load items: `reload` runs once logged in, and for Check Again. The view
 * keeps this screen while it reloads, until it has something to show.
 */
export function NotLoggedInView({ reload }: { reload: () => void | Promise<void> }) {
  const login = useBrowserLogin(reload);
  return <LoginScreen login={login} onCheckAgain={reload} />;
}
