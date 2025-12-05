import { Action, ActionPanel, List, Icon, Image, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getNotifications } from "./utils/jira";
import { Preferences } from "./utils/types";

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  const { data: notifications, isLoading } = usePromise(getNotifications);

  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Notification structure varies, but generally:
  // { id, title: "X mentioned you", htmlUrl, read: false, author: { displayName, avatarUrl } }
  // Actually, standard Jira Cloud V3 Notification object schema is strict but let's assume common fields.

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter notifications...">
      {notifications?.map((n) => {
        // Safe access
        const title = n.title || n.subject || "No Title";
        const subtitle = n.textBody || "";
        const url = n.url || n.htmlUrl || `https://${domain}`;

        // Use htmlUrl if available for external link functionality
        /* 
                   Normally notifications from API have:
                   - id
                   - title (e.g. "USER commented on ISSUE-123")
                   - created
                   - actor (user who triggered)
                */

        return (
          <List.Item
            key={n.id}
            title={title}
            subtitle={subtitle}
            icon={n.actor?.avatarUrl ? { source: n.actor.avatarUrl, mask: Image.Mask.Circle } : Icon.Bell}
            accessories={[{ date: new Date(n.created) }]}
            actions={
              <ActionPanel>
                {/* Try to construct a valid browser URL from the API response object or fallback to domain */}
                <Action.OpenInBrowser url={url.startsWith("http") ? url : `https://${domain}`} />
              </ActionPanel>
            }
          />
        );
      })}
      {(!notifications || notifications.length === 0) && !isLoading && (
        <List.EmptyView title="No new notifications" icon={Icon.CheckCircle} />
      )}
    </List>
  );
}
