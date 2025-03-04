import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useAuth } from "../../lib/use-auth";
import { User } from "@supabase/supabase-js";

export default function AuthenticatedView({
  component: Component,
}: {
  component: React.ComponentType<{ user: User }>;
}) {
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
}
