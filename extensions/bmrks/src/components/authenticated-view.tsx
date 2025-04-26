import React from "react";

import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";

import { User } from "@supabase/supabase-js";
import { useAuth } from "../../lib/use-auth";

interface AuthenticatedViewProps {
  component: React.ComponentType<{ user: User }>;
}

export default function AuthenticatedView({ component: Component }: AuthenticatedViewProps): React.ReactElement | null {
  const { data: user, isLoading, error } = useAuth();

  const errorMessage = error?.message.includes("Invalid login credentials")
    ? error.message + ". Please open the preferences and try again."
    : error?.message;

  if (user) {
    return <Component user={user} />;
  }

  if (isLoading) {
    return <Detail isLoading />;
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          title={"Problem fetching bookmarks"}
          description={errorMessage}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return null;
}
