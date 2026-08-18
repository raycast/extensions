import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { ApiError } from "../lib/api";
import { signIn } from "../lib/oauth";
import { BILLING_URL } from "../lib/wire";

/**
 * The right screen for an API refusal: sign-in for an auth error, the Pro gate
 * for `permission`, else a retryable error. `onRecover` re-runs the load.
 */
export function refusalView(error: ApiError, onRecover: () => void) {
  if (error.code === "unauthenticated" || error.code === "unauthorized") {
    return <SignedOutView onSignedIn={onRecover} />;
  }
  if (error.code === "permission") return <ProRequiredView />;
  return <ErrorView message={error.message} onRetry={onRecover} />;
}

/** Shown when there is no live session. */
export function SignedOutView(props: { onSignedIn: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="Sign in to Reassign"
        description="Connect your Reassign account to see and plan your day."
        actions={
          <ActionPanel>
            <Action
              title="Sign in"
              icon={Icon.Key}
              onAction={async () => {
                try {
                  await signIn();
                  props.onSignedIn();
                } catch {
                  // The user cancelled the browser flow, or it failed. Return
                  // quietly to the signed-out view instead of a raw error.
                }
              }}
            />
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
