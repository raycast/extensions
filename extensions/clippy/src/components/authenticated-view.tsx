import { showToast, Toast, Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useAuth } from "../../lib/use-auth";
import { clearAuthentication } from "../../lib/oauth";

interface User {
  user?: {
    notion_reading_list_db_id?: string;
  };
}

export default function AuthenticatedView({
  component: Component,
}: {
  component: React.ComponentType<{ user: User }>;
}) {
  const { data: user, isLoading, error, revalidate } = useAuth();

  async function handleLogout() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Logging out...",
      });

      await clearAuthentication();

      await showToast({
        style: Toast.Style.Success,
        title: "Logged out successfully",
      });

      // Force revalidation
      revalidate();
    } catch (error) {
      showFailureToast(error, { title: "Failed to logout" });
    }
  }

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
          title={"Authentication Required"}
          description={error?.message || "Please authenticate with Google to continue"}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Clear Authentication" icon={Icon.Trash} onAction={handleLogout} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return null;
}
