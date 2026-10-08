import { spawn } from "node:child_process";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  environment,
  Icon,
  List,
  open,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { CliError, cliPath, run } from "./lib/cli";
import { clearLocalData } from "./lib/files";
import { isDemo, setDemo } from "./lib/demo";
import { showError } from "./lib/errors";
import { handleSignedOut } from "./lib/session";

type AuthState =
  | { status: "authenticated" }
  | { status: "logged-out"; detail: string }
  | { status: "no-cli"; detail: string }
  | { status: "error"; message: string };

/** Listing the top-level sections is the cheapest call that needs a valid session. */
async function checkAuth(): Promise<AuthState> {
  if (isDemo()) return { status: "authenticated" };
  try {
    cliPath();
  } catch (error) {
    return { status: "no-cli", detail: (error as CliError).stderr };
  }
  try {
    await run(["filesystem", "list", "--json", "/"], 60_000);
    return { status: "authenticated" };
  } catch (error) {
    // Only a missing session means "not signed in"; a network error or a CLI crash is shown as such.
    if (error instanceof CliError && error.signedOut) {
      // The session may have ended outside the extension: drop local data as Log Out would.
      await handleSignedOut();
      return { status: "logged-out", detail: error.stderr };
    }
    return { status: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Runs `proton-drive auth login`. Sign-in happens in the browser; if the CLI prints the sign-in URL
 * instead of opening it, open it ourselves.
 */
function loginInBackground(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cliPath(), ["auth", "login"], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let opened = false;
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      // Only follow Proton sign-in pages, whatever else the CLI might print.
      const url = output.match(/https:\/\/(?:[\w-]+\.)*proton\.me(?:\/\S*)?/)?.[0];
      if (url && !opened) {
        opened = true;
        open(url);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    const timer = setTimeout(() => child.kill(), 5 * 60_000);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new CliError("Login did not complete", output.trim() || `Exit code ${code}`));
    });
  });
}

/** Fallback: run the login in Terminal, where the CLI can prompt interactively. */
async function loginInTerminal() {
  await mkdir(environment.supportPath, { recursive: true });
  const script = join(environment.supportPath, "login.command");
  await writeFile(script, `#!/bin/zsh\n'${cliPath().replace(/'/g, "'\\''")}' auth login\n`);
  await chmod(script, 0o700);
  await open(script, "com.apple.Terminal");
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(checkAuth);
  const [demo, setDemoState] = useState(isDemo());

  async function toggleDemo() {
    await setDemo(!demo);
    setDemoState(!demo);
    await showToast({
      style: Toast.Style.Success,
      title: demo ? "Demo data off" : "Demo data on",
      message: demo ? "Back to your real Drive" : "Search Files now shows an invented Drive",
    });
    revalidate();
  }

  async function login() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Waiting for sign-in in your browser…" });
    try {
      await loginInBackground();
      toast.style = Toast.Style.Success;
      toast.title = "Signed in to Proton Drive";
      revalidate();
    } catch (error) {
      await toast.hide();
      await showError(error, "Login failed");
    }
  }

  async function logout() {
    if (isDemo()) {
      // Never touch the real session while showing demo data.
      await showToast({ style: Toast.Style.Success, title: "Logged out (demo)" });
      return;
    }
    const confirmed = await confirmAlert({
      title: "Log out of Proton Drive?",
      message:
        "The CLI session stored in your Keychain will be removed, along with the search index, cached folder listings and opened files.",
      primaryAction: { title: "Log Out", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await run(["auth", "logout"], 60_000);
      await clearLocalData();
      await showToast({ style: Toast.Style.Success, title: "Logged out" });
      revalidate();
    } catch (error) {
      await showError(error, "Logout failed");
    }
  }

  const refresh = (
    <Action
      title="Check Again"
      icon={Icon.ArrowClockwise}
      onAction={revalidate}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );

  return (
    <List isLoading={isLoading}>
      {data?.status === "authenticated" && (
        <List.Item
          title="Signed in to Proton Drive"
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              {refresh}
              <Action title="Log out" icon={Icon.Logout} style={Action.Style.Destructive} onAction={logout} />
            </ActionPanel>
          }
        />
      )}
      {data?.status === "logged-out" && (
        <List.Item
          title="Not signed in"
          subtitle="Sign-in happens in your browser"
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Login" icon={Icon.Key} onAction={login} />
              <Action title="Login in Terminal (Fallback)" icon={Icon.Terminal} onAction={loginInTerminal} />
              {refresh}
            </ActionPanel>
          }
        />
      )}
      {data?.status === "error" && (
        <List.Item
          title="Could not check the session"
          subtitle={data.message}
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              {refresh}
              <Action title="Login" icon={Icon.Key} onAction={login} />
            </ActionPanel>
          }
        />
      )}
      {data?.status === "no-cli" && (
        <List.Item
          title="Proton Drive CLI not found"
          subtitle={data.detail}
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Download the CLI" url="https://proton.me/download/drive/cli/index.html" />
              {refresh}
            </ActionPanel>
          }
        />
      )}
      {environment.isDevelopment && (
        <List.Section title="Development">
          <List.Item
            title="Demo Data"
            subtitle="Invented files for store screenshots, generated locally"
            icon={Icon.Wand}
            accessories={[{ tag: demo ? { value: "On", color: Color.Green } : "Off" }]}
            actions={
              <ActionPanel>
                <Action
                  title={demo ? "Turn Demo Data off" : "Turn Demo Data on"}
                  icon={Icon.Wand}
                  onAction={toggleDemo}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
