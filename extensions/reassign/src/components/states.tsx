import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { ApiError } from "../lib/api";
import { signIn, signOut } from "../lib/oauth";
import { BILLING_URL } from "../lib/wire";

/** Pick the screen for an API refusal: re-auth, the Pro gate, or a retry. */
export function refusalView(error: ApiError, onRecover: () => void) {
  if (error.code === "unauthenticated" || error.code === "unauthorized") {
    return <ReauthView onSignedIn={onRecover} />;
  }
  if (error.code === "permission") return <ProRequiredView />;
  return <ErrorView message={error.message} onRetry={onRecover} />;
}

/** Re-run the native OAuth after a mid-session grant loss; clear the stale token first. */
function ReauthView(props: { onSignedIn: () => void }) {
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  // A cancelled or failed flow shows a manual retry, not a stuck spinner.
  async function reauth() {
    setFailed(false);
    try {
      await signOut();
      await signIn();
      props.onSignedIn();
    } catch {
      setFailed(true);
    }
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    reauth();
  }, []);
  if (!failed) return <List isLoading />;
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="Sign in to Reassign"
        description="Connect your Reassign account to see and plan your day."
        actions={
          <ActionPanel>
            <Action title="Sign in to Reassign" icon={Icon.Key} onAction={reauth} />
          </ActionPanel>
        }
      />
    </List>
  );
}

/** Shown when the API refuses with `permission` (the Pro paywall). */
export function ProRequiredView() {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
        title="Reassign Pro required"
        description="Your account needs an active Pro plan to use this extension. Open Reassign to upgrade."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Upgrade to Pro" url={BILLING_URL} />
          </ActionPanel>
        }
      />
    </List>
  );
}

/** Shown for any other refusal. */
function ErrorView(props: { message: string; onRetry: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Could not load your plan"
        description={props.message}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
          </ActionPanel>
        }
      />
    </List>
  );
}
