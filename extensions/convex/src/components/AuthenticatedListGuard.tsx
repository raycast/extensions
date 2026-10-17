/**
 * AuthenticatedListGuard - Hook for handling authentication in List-based commands
 *
 * Returns JSX for loading state or sign-in prompt if not authenticated,
 * otherwise returns null so the parent component can continue rendering.
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React from "react";
import { useConvexAuth } from "../hooks/useConvexAuth";

/**
 * Hook for List-based commands that require authentication.
 * Returns JSX for loading/empty states when not authenticated,
 * or null when authenticated (so parent can render its own List).
 *
 * @param description - Description text for the sign-in prompt (e.g., "Connect your Convex account to browse tables")
 * @returns JSX element to return early, or null if authenticated
 *
 * @example
 * ```tsx
 * const authGuard = useAuthenticatedListGuard("Connect your Convex account to browse tables");
 * if (authGuard) return authGuard;
 * ```
 */
export function useAuthenticatedListGuard(
  description: string,
): React.JSX.Element | null {
  const { isLoading, isAuthenticated, login } = useConvexAuth();

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Loading..." />;
  }

  if (!isAuthenticated) {
    return (
      <List>
        <List.EmptyView
          title="Sign in to Convex"
          description={description}
          icon={Icon.Key}
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
      </List>
    );
  }

  // Return null when authenticated so parent can render its content
  return null;
}
