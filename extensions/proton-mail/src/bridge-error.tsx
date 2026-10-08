import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  getApplications,
  getPreferenceValues,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { BridgeErrorReason, checkBridge } from "./imap-client";

const BRIDGE_BUNDLE_ID = "com.protonmail.bridge";

async function openBridge() {
  try {
    const applications = await getApplications();
    const bridge = applications.find(
      (application) => application.bundleId === BRIDGE_BUNDLE_ID || application.name === "Proton Mail Bridge",
    );
    if (bridge) {
      await open(bridge.path);
      return;
    }
  } catch {
    // Fall back to the download page below
  }
  await open("https://proton.me/mail/bridge");
}

// "waiting": Bridge answers but rejects the login. It does that while it loads the account after starting, so a
// rejection only counts as wrong credentials once it has lasted ACCOUNT_LOAD_MS, even on the first try (Bridge may
// have been started just before the command).
export type BridgeScreen = "unreachable" | "waiting" | "authentication";

function firstScreen(reason: BridgeErrorReason): BridgeScreen {
  return reason === "authentication" ? "waiting" : reason;
}

// Raycast keeps the command open in the background, so an error screen would stay up after Bridge starts.
// Check Bridge again every few seconds instead, and reload once it lets us in.
const CHECK_INTERVAL_MS = 2000;
// Bridge listens before it has loaded the accounts and rejects logins until then, so only trust a rejection
// once it has lasted this long
const ACCOUNT_LOAD_MS = 30000;
// Time for the reload to finish before checking again, in case it fails the same way
const RELOAD_MS = 10000;

export function watchBridge(
  reason: BridgeErrorReason,
  onScreen: (screen: BridgeScreen) => void,
  onReady: () => void,
): () => void {
  let screen = firstScreen(reason);
  const show = (next: BridgeScreen) => {
    if (next === screen) return;
    screen = next;
    onScreen(next);
  };
  let rejectedSince = reason === "authentication" ? Date.now() : undefined;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const check = async () => {
    const status = await checkBridge();
    if (stopped) return;
    let delay = CHECK_INTERVAL_MS;
    if (status === "ready") {
      onReady();
      delay = RELOAD_MS;
    } else if (status === "authentication") {
      rejectedSince ??= Date.now();
      if (Date.now() - rejectedSince >= ACCOUNT_LOAD_MS) {
        // Bridge has had time to load the account: the credentials are wrong, stop logging in with them
        show("authentication");
        return;
      }
      show("waiting");
    } else if (status === "unreachable") {
      rejectedSince = undefined;
      show("unreachable");
    }
    timer = setTimeout(check, delay);
  };

  timer = setTimeout(check, CHECK_INTERVAL_MS);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

// Shown instead of an empty folder when Bridge can't be reached or rejects the credentials
export function BridgeErrorView({ reason, onRetry }: { reason: BridgeErrorReason; onRetry: () => void }) {
  const [watched, setWatched] = useState<{ reason: BridgeErrorReason; screen: BridgeScreen }>({
    reason,
    screen: firstScreen(reason),
  });
  const screen = watched.reason === reason ? watched.screen : firstScreen(reason);

  const onRetryRef = useRef(onRetry);
  useEffect(() => {
    onRetryRef.current = onRetry;
  });
  useEffect(
    () =>
      watchBridge(
        reason,
        (next) => setWatched({ reason, screen: next }),
        () => onRetryRef.current(),
      ),
    [reason],
  );

  // Check before reloading, so trying again while Bridge is still down doesn't flash the screen
  const tryAgain = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting to Proton Mail Bridge" });
    const status = await checkBridge();
    if (status === "unreachable" || status === "authentication") {
      toast.style = Toast.Style.Failure;
      toast.title = status === "unreachable" ? "Can't reach Proton Mail Bridge" : "Bridge rejected your credentials";
      return;
    }
    await toast.hide();
    onRetry();
  };
  const retry = (
    <Action
      title="Try Again"
      icon={Icon.ArrowClockwise}
      onAction={tryAgain}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
  const preferences = (
    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
  );
  const bridge = <Action title="Open Proton Mail Bridge" icon={Icon.AppWindow} onAction={openBridge} />;

  if (screen === "authentication") {
    return (
      <List.EmptyView
        icon={Icon.Lock}
        title="Proton Mail Bridge Rejected Your Credentials"
        description="Use the username and password shown in Bridge, not your Proton password."
        actions={
          <ActionPanel>
            {preferences}
            {bridge}
            {retry}
          </ActionPanel>
        }
      />
    );
  }

  if (screen === "waiting") {
    return (
      <List.EmptyView
        icon={Icon.Clock}
        title="Waiting for Proton Mail Bridge"
        description="Bridge may still be loading your account. If this lasts, check the username and password."
        actions={
          <ActionPanel>
            {bridge}
            {retry}
            {preferences}
          </ActionPanel>
        }
      />
    );
  }

  // Nothing answered: Bridge may be stopped, or running on another host or port than the preferences say
  const { imapHost, imapPort } = getPreferenceValues<Preferences>();
  return (
    <List.EmptyView
      icon={Icon.Plug}
      title="Can't Reach Proton Mail Bridge"
      description={`Start Bridge, or check the host and port in the preferences (${imapHost}:${imapPort}).`}
      actions={
        <ActionPanel>
          {bridge}
          {retry}
          {preferences}
        </ActionPanel>
      }
    />
  );
}
