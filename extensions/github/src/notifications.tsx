import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { partition } from "lodash";
import { useMemo, useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import NotificationListItem from "./components/NotificationListItem";
import RepositoriesDropdown from "./components/RepositoryDropdown";
import { getNotificationIcon, Notification } from "./helpers/notifications";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useViewer } from "./hooks/useViewer";

export type NotificationWithIcon = Notification & { icon: Awaited<ReturnType<typeof getNotificationIcon>> };

function Notifications() {
  const { octokit } = getGitHubClient();

  const viewer = useViewer();

  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);

  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(async () => {
    const response = await octokit.activity.listNotificationsForAuthenticatedUser({ all: true });
    return Promise.all(
      response.data.map(async (notification: Notification) => {
        const icon = await getNotificationIcon(notification);
        return { ...notification, icon };
      }),
    );
  });

  const notifications = useMemo(() => {
    if (selectedRepository) {
      return data?.filter((notification: Notification) => notification.repository.full_name === selectedRepository);
    }

    return data;
  }, [data, selectedRepository]);

  const [unreadNotifications, readNotifications] = partition(notifications, (notification) => notification.unread);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by title"
      searchBarAccessory={<RepositoriesDropdown setSelectedRepository={setSelectedRepository} />}
    >
      {unreadNotifications.length > 0 ? (
        <List.Section title="Unread">
          {unreadNotifications.map((notification) => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              userId={viewer?.id}
              mutateList={mutateList}
            />
          ))}
        </List.Section>
      ) : null}

      {readNotifications.length > 0 ? (
        <List.Section title="Read">
          {readNotifications.map((notification) => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              userId={viewer?.id}
              mutateList={mutateList}
            />
          ))}
        </List.Section>
      ) : null}

      <List.EmptyView title="No recent notifications found" />
    </List>
  );
}

export default withGitHubClient(Notifications);
