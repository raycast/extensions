/**
 * Authenticated View wrapper
 */

import { Detail, List, Icon, ActionPanel, Action } from "@raycast/api";
import { useAuth } from "../hooks/useAuth";

interface AuthenticatedViewProps {
  children: React.ReactNode;
}

export function AuthenticatedView({ children }: AuthenticatedViewProps) {
  const { authState, handleConnect } = useAuth();

  if (authState === "checking") {
    return <Detail isLoading={true} markdown="Checking connection..." />;
  }

  if (authState === "not_connected") {
    return (
      <List searchBarPlaceholder="Connect to continue...">
        <List.Item
          icon={Icon.Link}
          title="Connect to Cleyo"
          subtitle="Press Enter to sign in via browser"
          actions={
            <ActionPanel>
              <Action
                title="Connect Account"
                icon={Icon.Link}
                onAction={handleConnect}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (authState === "connecting") {
    return (
      <Detail
        isLoading={true}
        markdown={`# Waiting for login...

A browser window has opened. Please:

1. Log in to Cleyo (or create an account)
2. Click "Connect Raycast" on the web page
3. Return here once connected

*This will update automatically when you complete the login.*`}
      />
    );
  }

  return <>{children}</>;
}
