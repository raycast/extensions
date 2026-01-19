/**
 * AuthGuard - Component that ensures user is authenticated
 *
 * Shows login prompt if not authenticated, otherwise renders children.
 */

import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useConvexAuth } from "../hooks/useConvexAuth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading, isAuthenticated, login } = useConvexAuth();

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading..." />;
  }

  if (!isAuthenticated) {
    return (
      <Detail
        markdown={`
# Connect to Convex

You need to sign in to your Convex account to use this extension.

Click **Sign in with Convex** below to authenticate in your browser.
        `}
        actions={
          <ActionPanel>
            <Action
              title="Sign in with Convex"
              icon={Icon.Key}
              onAction={login}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Pass session to children via context or render props
  return <>{children}</>;
}

/**
 * Hook to get the authenticated session
 * Must be used inside AuthGuard
 */
export function useAuthenticatedSession() {
  const auth = useConvexAuth();
  if (!auth.session) {
    throw new Error(
      "useAuthenticatedSession must be used inside AuthGuard when authenticated",
    );
  }
  return auth;
}
