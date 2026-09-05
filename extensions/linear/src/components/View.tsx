import { Action, ActionPanel, Detail } from "@raycast/api";
import React, { useEffect } from "react";

import { bootstrapWorkspaceAuth, clearActiveWorkspaceTokens, getWorkspaceSnapshot } from "../api/linearClient";
import { withWorkspaceAuth } from "../api/withWorkspaceAuth";
import { checkLinearApp } from "../helpers/isLinearInstalled";

import { WorkspaceProvider } from "./WorkspaceContext";

/**
 * Makes sure that we have a authenticated linear client available in the children
 */
function View({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    checkLinearApp();
  }, []);

  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}

interface AuthErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches OAuth errors (e.g. invalid_grant) and shows a recoverable
 * "Sign In" screen instead of Raycast's generic "Something went wrong" overlay.
 */
class AuthErrorBoundary extends React.Component<{ children: React.ReactNode }, AuthErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return { error };
  }

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    const isAuthError =
      error.message.includes("invalid_grant") ||
      error.message.includes("Error while fetching tokens") ||
      error.message.includes("Could not initialize OAuth");

    // Re-throwing inside render() delegates to the next parent error boundary (Raycast's
    // top-level handler). This is intentional: we only want to intercept known auth errors
    // and let everything else surface normally.
    if (!isAuthError) throw error;

    const failedWorkspaceName = getWorkspaceSnapshot()?.activeEntry?.orgName;

    return (
      <Detail
        markdown={`# Sign In Failed${failedWorkspaceName ? ` — ${failedWorkspaceName}` : ""}\n\nFailed to authenticate with Linear:\n\`\`\`\n${error.message}\n\`\`\`\n\nThis can happen when the network is unreliable or the authorization code has expired. Please try signing in again.`}
        actions={
          <ActionPanel>
            <Action
              title="Sign in Again"
              onAction={async () => {
                await clearActiveWorkspaceTokens();
                try {
                  await bootstrapWorkspaceAuth(); // fresh interactive flow, identity-verified (ensureEntryToken)
                  this.setState({ error: null });
                } catch (error) {
                  this.setState({ error: error instanceof Error ? error : new Error(String(error)) });
                }
              }}
            />
            <Action.Open title="Manage Workspaces" target="raycast://extensions/linear/linear/manage-workspaces" />
          </ActionPanel>
        }
      />
    );
  }
}

const AuthenticatedView = withWorkspaceAuth(View);

export default function ViewWithErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <AuthErrorBoundary>
      <AuthenticatedView>{children}</AuthenticatedView>
    </AuthErrorBoundary>
  );
}
