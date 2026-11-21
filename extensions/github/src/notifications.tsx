import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { partition } from "lodash";
import { useMemo, useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import NotificationListItem from "./components/NotificationListItem";
import RepositoriesDropdown from "./components/RepositoryDropdown";
import { uniqueById } from "./helpers";
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
    (repository) =>
      async ({ cursor }) => {
        const page = cursor ? Number(cursor) : 1;
        const response = repository
          ? await octokit.activity.listRepoNotificationsForAuthenticatedUser({
              owner: repository.split("/")[0],
              repo: repository.split("/")[1],
              all: true,
              per_page: NOTIFICATIONS_PAGE_SIZE,
              page,
            })
          : await octokit.activity.listNotificationsForAuthenticatedUser({
              all: true,
              per_page: NOTIFICATIONS_PAGE_SIZE,
              page,
            });
        const hasMore =
          response.headers.link?.includes('rel="next"') ?? response.data.length === NOTIFICATIONS_PAGE_SIZE;
        const notifications = await Promise.all(
          response.data.map(async (notification: Notification) => ({
            ...notification,
            icon: await getNotificationIcon(notification),
          })),
        );

        return {
          data: notifications,
          hasMore,
          cursor: hasMore ? String(page + 1) : undefined,
        };
      },
    [selectedRepository],
  );

  const notifications = useMemo(() => {
    return uniqueById(data ?? []);
  }, [data]);

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
