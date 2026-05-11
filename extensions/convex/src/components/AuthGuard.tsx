/**
 * AuthGuard - Component that ensures user is authenticated
 *
 * Shows login prompt if not authenticated, otherwise renders children.
 * In deploy key mode, authentication is automatic (no login required).
 */

import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useConvexAuth } from "../hooks/useConvexAuth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const {
    isLoading,
    isAuthenticated,
    isDeployKeyMode,
    deployKeyConfig,
    login,
  } = useConvexAuth();

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading..." />;
  }

  // In deploy key mode, if something is wrong with the config, show a message
  if (isDeployKeyMode && !deployKeyConfig) {
    return (
      <Detail
        markdown={`
# Deploy Key Configuration Error

Your deploy key configuration appears to be invalid. Please check your extension preferences.

**Expected format:**
- Deploy Key: \`instance-name|key-value\` or \`prod:instance-name|key-value\`
- Deployment URL: \`https://instance-name.convex.cloud\`

Click **Open Preferences** to update your configuration.
        `}
        actions={
          <ActionPanel>
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <Detail
        markdown={`
# Connect to Convex

You need to sign in to your Convex account to use this extension.

**Option 1: Sign in with Convex** (recommended)
Click the button below to authenticate in your browser.

**Option 2: Use a Deploy Key**
Open Extension Preferences and configure:
- Deploy Key
- Deployment URL

This is useful for accessing a specific deployment directly.
        `}
        actions={
          <ActionPanel>
            <Action
              title="Sign in with Convex"
              icon={Icon.Key}
              onAction={login}
            />
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd"], key: "," }}
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
