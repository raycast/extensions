import { Action, ActionPanel, Detail } from "@raycast/api";
import React from "react";

import { withGoogleAuth } from "../api/google";
import { signOutAndClearCaches } from "../api/session";
import { isAuthError } from "../helpers/errors";

function Passthrough({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const AuthenticatedView = withGoogleAuth(Passthrough);

interface BoundaryState {
  error: Error | null;
}

/**
 * Catches OAuth failures during sign-in (e.g. `invalid_grant` when a refresh token was revoked)
 * and offers "Sign in Again" instead of Raycast's generic error screen. Other errors are rethrown.
 */
class AuthErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    // Only intercept sign-in errors; everything else goes to Raycast's own handler.
    if (!isAuthError(error)) throw error;
    return (
      <Detail
        markdown={`# Sign In Failed\n\nGoogle sign-in didn't work:\n\n\`\`\`\n${error.message}\n\`\`\`\n\nThis happens when access was revoked, the client ID changed, or the authorization code expired. Sign in again to continue.`}
        actions={
          <ActionPanel>
            <Action
              title="Sign in Again"
              onAction={async () => {
                await signOutAndClearCaches();
                this.setState({ error: null });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }
}

/** Wraps a view command: signs in with Google first and recovers from sign-in errors. */
export function ChatView({ children }: { children: React.ReactNode }) {
  return (
    <AuthErrorBoundary>
      <AuthenticatedView>{children}</AuthenticatedView>
    </AuthErrorBoundary>
  );
}
