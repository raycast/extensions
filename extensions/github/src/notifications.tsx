import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { partition } from "lodash";
import { useMemo, useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import NotificationListItem from "./components/NotificationListItem";
import RepositoriesDropdown from "./components/RepositoryDropdown";
import { getErrorMessage } from "./helpers/errors";
import { getNotificationIcon, Notification } from "./helpers/notifications";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useViewer } from "./hooks/useViewer";

export type NotificationWithIcon = Notification & { icon: Awaited<ReturnType<typeof getNotificationIcon>> };

const NOTIFICATIONS_PAGE_SIZE = 25;

function Notifications() {
  const { octokit } = getGitHubClient();

  const viewer = useViewer();

  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
    mutate: mutateList,
    pagination,
  } = useCachedPromise(
    () => async (options: { page: number }) => {
      const response = await octokit.activity.listNotificationsForAuthenticatedUser({
        all: true,
        per_page: NOTIFICATIONS_PAGE_SIZE,
        page: options.page + 1,
      });

      const notifications = await Promise.all(
        response.data.map(async (notification: Notification) => {
          const icon = await getNotificationIcon(notification);
          return { ...notification, icon };
        }),
      );

      return {
        data: notifications,
        hasMore: response.data.length === NOTIFICATIONS_PAGE_SIZE,
      };
    },
    [],
  );

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
      pagination={pagination}
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

      <List.EmptyView
        icon={error ? Icon.Warning : undefined}
        title={error ? "Failed to Load Notifications" : "No recent notifications found"}
        description={error ? getErrorMessage(error) : undefined}
      />
    </List>
  );
}

export default withGitHubClient(Notifications);
