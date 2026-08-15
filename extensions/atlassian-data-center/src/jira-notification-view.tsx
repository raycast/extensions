import { useEffect, useMemo, useState } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import dayjs from "dayjs";

import { withQuery, CacheActions } from "@/components";
import { PAGINATION_SIZE, AVATAR_TYPE } from "@/constants";
import {
  useJiraNotificationsInfiniteQuery,
  useMarkJiraNotificationAsReadMutation,
  useMarkJiraAllNotificationsAsReadMutation,
  useSetJiraNotificationStateMutation,
  useAvatar,
  useJiraNotificationAvailableCachedState,
  useRefetchWithToast,
  useFetchNextPageWithToast,
} from "@/hooks";
import type { ProcessedJiraNotification } from "@/types";

const EMPTY_INFINITE_DATA = { list: [], total: 0 };

export default withQuery(JiraNotificationView);

function JiraNotificationView() {
  const [searchText, setSearchText] = useState("");

  const {
    available: notificationAvailable,
    setAvailable: setNotificationAvailable,
    resetAvailable: resetNotificationAvailable,
  } = useJiraNotificationAvailableCachedState();

  const {
    data = EMPTY_INFINITE_DATA,
    error,
    isLoading,
    isSuccess,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useJiraNotificationsInfiniteQuery({
    enabled: notificationAvailable,
    meta: { errorMessage: "Failed to Load Notifications" },
  });

  const markAsReadMutation = useMarkJiraNotificationAsReadMutation({
    onSuccess: () => {
      showToast(Toast.Style.Success, "Marked as read");
      refetch();
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to Mark as Read" });
    },
  });

  const setNotificationStateMutation = useSetJiraNotificationStateMutation({
    onSuccess: () => {
      showToast(Toast.Style.Success, "Marked as unread");
      refetch();
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to Mark as Unread" });
    },
  });

  const markAllAsReadMutation = useMarkJiraAllNotificationsAsReadMutation({
    onSuccess: () => {
      showToast(Toast.Style.Success, "Marked all as read");
      refetch();
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to Mark All as Read" });
    },
  });

  useAvatar<ProcessedJiraNotification>({
    items: data.list,
    avatarType: AVATAR_TYPE.JIRA_USER,
    collectAvatars: (items) =>
      items
        .filter((item) => item.actionMakerAvatarUrl && item.actionMakerAvatarCacheKey)
        .map((item) => ({ url: item.actionMakerAvatarUrl, key: item.actionMakerAvatarCacheKey! })),
  });

  const fetchNextPageWithToast = useFetchNextPageWithToast({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const refetchWithToast = useRefetchWithToast({ refetch });

  useEffect(() => {
    if (error && error.message.includes("404")) {
      setNotificationAvailable(false);
    }
  }, [error, setNotificationAvailable]);

  const { todayNotifications, yesterdayNotifications, earlierNotifications } = useMemo(() => {
    const today: ProcessedJiraNotification[] = [];
    const yesterday: ProcessedJiraNotification[] = [];
    const earlier: ProcessedJiraNotification[] = [];

    const todayStart = dayjs().startOf("day");
    const yesterdayStart = todayStart.subtract(1, "day");

    const trimmedSearchText = searchText.trim().toLowerCase();

    data.list.forEach((item) => {
      if (trimmedSearchText) {
        const titleValue = typeof item.title === "string" ? item.title : item.title.value;
        const titleMatched = titleValue.toLowerCase().includes(trimmedSearchText);

        const keywordsMatched = item.keywords
          ? item.keywords.some((keyword) => keyword.toLowerCase().includes(trimmedSearchText))
          : false;

        const stateMatched =
          (trimmedSearchText === "unread" && item.state === 0) || (trimmedSearchText === "read" && item.state === 1);

        const matched = titleMatched || keywordsMatched || stateMatched;
        if (!matched) return;
      }

      const actionDate = dayjs(item.actionTime);

      if (actionDate.isAfter(todayStart) || actionDate.isSame(todayStart)) {
        today.push(item);
      } else if (actionDate.isAfter(yesterdayStart) || actionDate.isSame(yesterdayStart)) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return {
      todayNotifications: today,
      yesterdayNotifications: yesterday,
      earlierNotifications: earlier,
    };
  }, [data.list, searchText]);

  const isEmpty = isSuccess && !data.list.length;

  const handleOpenInBrowser = (notification: ProcessedJiraNotification) => {
    // If unread, mark as read first
    if (notification.state === 0) {
      handleMarkAsRead(notification);
    }
  };

  const handleMarkAsRead = (notification: ProcessedJiraNotification) => {
    markAsReadMutation.mutateAsync(notification.notificationId);
  };

  const handleMarkAsUnread = (notification: ProcessedJiraNotification) => {
    setNotificationStateMutation.mutateAsync(notification.notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutateAsync();
  };

  return (
    <List
      throttle
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter by title, key, state"
      navigationTitle="Notification View"
      pagination={{
        hasMore: hasNextPage,
        onLoadMore: fetchNextPageWithToast,
        pageSize: PAGINATION_SIZE,
      }}
    >
      {!notificationAvailable ? (
        <NotificationUnavailableEmptyView onCheckAgain={resetNotificationAvailable} />
      ) : isEmpty ? (
        <NoNotificationsEmptyView onRefetch={refetchWithToast} />
      ) : (
        <>
          {todayNotifications.length > 0 && (
            <List.Section title="Today" subtitle={`${todayNotifications.length} items`}>
              {todayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.renderKey}
                  notification={notification}
                  onOpenInBrowser={handleOpenInBrowser}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAsUnread={handleMarkAsUnread}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onRefetch={refetchWithToast}
                />
              ))}
            </List.Section>
          )}
          {yesterdayNotifications.length > 0 && (
            <List.Section title="Yesterday" subtitle={`${yesterdayNotifications.length} items`}>
              {yesterdayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.renderKey}
                  notification={notification}
                  onOpenInBrowser={handleOpenInBrowser}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAsUnread={handleMarkAsUnread}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onRefetch={refetchWithToast}
                />
              ))}
            </List.Section>
          )}
          {earlierNotifications.length > 0 && (
            <List.Section title="Earlier" subtitle={`${earlierNotifications.length} items`}>
              {earlierNotifications.map((notification) => (
                <NotificationItem
                  key={notification.renderKey}
                  notification={notification}
                  onOpenInBrowser={handleOpenInBrowser}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAsUnread={handleMarkAsUnread}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onRefetch={refetchWithToast}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function NotificationItem({
  notification,
  onOpenInBrowser,
  onMarkAsRead,
  onMarkAsUnread,
  onMarkAllAsRead,
  onRefetch,
}: {
  notification: ProcessedJiraNotification;
  onOpenInBrowser: (notification: ProcessedJiraNotification) => void;
  onMarkAsRead: (notification: ProcessedJiraNotification) => void;
  onMarkAsUnread: (notification: ProcessedJiraNotification) => void;
  onMarkAllAsRead: () => void;
  onRefetch: () => Promise<void>;
}) {
  return (
    <List.Item
      title={notification.title}
      subtitle={notification.subtitle}
      icon={notification.icon}
      accessories={notification.accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Open in Browser"
            url={notification.url}
            onOpen={async () => {
              await onOpenInBrowser(notification);
            }}
          />
          {notification.state === 0 && (
            <Action icon={Icon.BellDisabled} title="Make as Read" onAction={() => onMarkAsRead(notification)} />
          )}
          {notification.state === 1 && (
            <Action icon={Icon.Bell} title="Make as Unread" onAction={() => onMarkAsUnread(notification)} />
          )}
          <Action icon={Icon.BellDisabled} title="Make All as Read" onAction={onMarkAllAsRead} />
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh"
            onAction={onRefetch}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <CacheActions />
        </ActionPanel>
      }
    />
  );
}

interface NotificationUnavailableEmptyViewProps {
  onCheckAgain: () => void;
}

function NotificationUnavailableEmptyView({ onCheckAgain }: NotificationUnavailableEmptyViewProps) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title="Notifications Not Available"
      description='This Jira instance does not have the "Notifications for Jira" plugin installed'
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="View More"
            url="https://marketplace.atlassian.com/apps/1217434/notifications-in-jira-desktop-and-icon-alerts"
          />
          <Action icon={Icon.Repeat} title="Check Again" onAction={onCheckAgain} />
        </ActionPanel>
      }
    />
  );
}

interface NoNotificationsEmptyViewProps {
  onRefetch: () => void;
}

function NoNotificationsEmptyView({ onRefetch }: NoNotificationsEmptyViewProps) {
  return (
    <List.EmptyView
      icon={Icon.Bell}
      title="No Results"
      description="You have no notifications"
      actions={
        <ActionPanel>
          <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={onRefetch} />
        </ActionPanel>
      }
    />
  );
}
