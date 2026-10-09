import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { ApiError } from "../lib/api";
import { SUBSCRIPTION_REQUIRED_MESSAGE, SUBSCRIPTION_REQUIRED_TITLE } from "../lib/feedback";
import { signIn } from "../lib/oauth";
import { PLAN_URL } from "../lib/wire";

/** Pick the screen for an API refusal: re-auth, the subscription gate, or a retry. */
export function refusalView(error: ApiError, onRecover: () => void) {
  // A retry repeats a `scope` 403. Only a new consent grants the missing scope.
  if (error.code === "signed_out" || error.code === "scope") {
    return <ReauthView onSignedIn={onRecover} automatic={false} />;
  }
  if (error.code === "unauthenticated" || error.code === "unauthorized") {
    return <ReauthView onSignedIn={onRecover} />;
  }
  if (error.code === "permission") return <SubscriptionRequiredView />;
  return <ErrorView message={error.message} onRetry={onRecover} />;
}

/** Re-run OAuth for session expiry; intentional logout waits for a user action. */
function ReauthView(props: { onSignedIn: () => void; automatic?: boolean }) {
  const started = useRef(false);
  // Gate the spinner solely on the `signIn` window, so the manual retry
  // reappears the moment `signIn` settles — even when the parent reconciles
  // `ReauthView` in place after `revalidate` returns the same refusal. Seeding
  // `true` for the automatic path keeps the initial spinner until the mount
  // effect fires `reauth(true)`.
  const [inFlight, setInFlight] = useState(props.automatic !== false);
  async function reauth(automatic = false) {
    setInFlight(true);
    try {
      await signIn({ automatic });
      props.onSignedIn();
    } catch {
      // Keep the manual retry visible; `inFlight` flips back in `finally`.
    } finally {
      setInFlight(false);
    }
  }
  useEffect(() => {
    if (started.current || props.automatic === false) return;
    started.current = true;
    void reauth(true);
  }, []);
  if (inFlight) return <List isLoading />;
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="Sign in to Reassign"
        description="Connect your Reassign account to see and plan your day."
        actions={
          <ActionPanel>
            <Action title="Sign in to Reassign" icon={Icon.Key} onAction={() => reauth()} />
          </ActionPanel>
        }
      />
    </List>
  );
}

/** Shown when the API refuses with `permission` (no active subscription). */
export function SubscriptionRequiredView() {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
        title={SUBSCRIPTION_REQUIRED_TITLE}
        description={SUBSCRIPTION_REQUIRED_MESSAGE}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Plan Settings" url={PLAN_URL} />
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
