import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { useAuth } from "../../lib/use-auth";
import { User } from "@supabase/supabase-js";

export default function AuthenticatedView({
  component: Component,
}: {
  component: React.ComponentType<{ user: User }>;
}) {
  const { data: user, isLoading, error } = useAuth();

  const markdown = error?.message.includes("Invalid login credentials")
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
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }
}
