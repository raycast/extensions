import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import {
  ErrorLoadingNotification,
  LoadingNotificationContent,
  MarkNotificationsAsRead,
  NewNotification,
  NewNotifications,
  NoNewNotifications,
  NotificationCacheKey,
  NotificationTextCacheKey,
  NotificationsReadToast,
  ReadNotificationSectionTitle,
  UnreadNotificationSectionTitle,
  ViewNotification,
  ViewNotificationsNavigationTitle,
  ViewNotificationsSearchBarPlaceholder,
  ViewingNotification,
} from "./utils/constants";
import { buildTitle, getAccountName, showLoadingToast, showSuccessToast } from "./utils/common";
import { getFormattedDateTime, getRelativeDateTime } from "./utils/date";
import { getNotifications, getPostThread, getUnreadNotificationCount, markNotificationsAsRead } from "./libs/atp";
import { getPostMarkdownView, parseNotifications } from "./utils/parser";
import { useCallback, useEffect, useState } from "react";

import AuthorFeed from "./components/feed/AuthorFeed";
import Error from "./components/error/Error";
import { ExtensionConfig } from "./config/config";
import HomeAction from "./components/actions/HomeAction";
import NavigationDropdown from "./components/nav/NavigationDropdown";
import { Notification } from "./types/types";
import Onboard from "./components/onboarding/Onboard";
import { isThreadViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { ViewImage } from "@atproto/api/dist/client/types/app/bsky/embed/images";
import { showDangerToast } from "./utils/common";
import { useCachedState } from "@raycast/utils";
import useStartATSession from "./hooks/useStartATSession";
import { AppBskyEmbedImages } from "@atproto/api";

interface ViewNotificationProps {
  previousViewTitle?: string;
}

export default function Notifications({ previousViewTitle = "" }: ViewNotificationProps) {
  const [notifications, setNotifications] = useCachedState<Notification[]>(NotificationCacheKey, []);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const { push } = useNavigation();
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [detailsText, setDetailsText] = useState<string>("");
  const [notificationText, setNotificationText] = useCachedState<string>(NotificationTextCacheKey, "");
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);

  const fetchNotifications = useCallback(
    async (invalidateCache: boolean) => {
      const notificationCursor = invalidateCache ? null : cursor;
      const data = await getNotifications(notificationCursor, ExtensionConfig.notificationRequestLimit);

      if (!data) {
        setNotificationsLoaded(false);
        return;
      }

      const notifications = parseNotifications(data.notifications);

      if (data.cursor) {
        setCursor(data.cursor);
      }

      setNotifications((state) => {
        if (invalidateCache) {
          state = [];
        }

        const existingIds = new Set(state.map((post) => post.id));
        const newNotifications = notifications.filter((post) => !existingIds.has(post.id));
        return [...state, ...newNotifications];
      });
    },
    [cursor],
  );

  useEffect(() => {
    (async () => {
      if (sessionStarted) {
        fetchNotifications(true);

        let notificationCount = 0;
        try {
          notificationCount = await getUnreadNotificationCount();
        } catch (error) {
          // This try...catch is to account for following case:
          // When user runs extension and session is expiring or expired, ERROR on next line is thrown
          // `initialRes.body?.cancel is not a function`
          // We swallow the exception as it is not helpful to the user
        }
        let notificationMessage = "";
        if (notificationCount > 1) {
          notificationMessage = `${notificationCount} ${NewNotifications}`;
        } else if (notificationCount == 1) {
          notificationMessage = `${notificationCount} ${NewNotification}`;
        } else {
          notificationMessage = NoNewNotifications;
        }

        setNotificationText(notificationMessage);
        showSuccessToast(notificationMessage);
        setNotificationsLoaded(true);
      }
    })();
  }, [sessionStarted]);

  const onSelectionChange = async (index: string | null) => {
    setShowDetails(false);
    setDetailsText("");

    if (!index) {
      return;
    }

    setSelectedNotificationId(index);

    if (index == notifications[notifications.length - 1].id) {
      await fetchNotifications(false);
    }
  };

  const onMarkNotificationsAsReadSelected = async () => {
    showLoadingToast("");
    await markNotificationsAsRead();
    await fetchNotifications(true);
    showSuccessToast(NotificationsReadToast);
    setNotificationText(NoNewNotifications);
  };

  const openNotification = async (notification: Notification) => {
    if (notification.targetPostUri) {
      setShowDetails(true);
      setDetailsText(`${LoadingNotificationContent}...`);
      showLoadingToast(LoadingNotificationContent);

      let uri = notification.targetPostUri;

      if (["reply", "quote", "mention"].includes(notification.reason)) {
        uri = notification.uri;
      }

      try {
        const responseData = await getPostThread(uri);
        if (!responseData || !responseData.thread || !isThreadViewPost(responseData.thread)) {
          return;
        }

        let imageEmbeds: string[] = [];
        const post = responseData.thread.post;

        if (AppBskyEmbedImages.isView(post.embed)) {
          imageEmbeds = post.embed.images.map((item: ViewImage) => item.thumb);
        }

        setDetailsText(await getPostMarkdownView(post, imageEmbeds));
        showSuccessToast(ViewingNotification);

        return;
      } catch (error) {
        showDangerToast(ErrorLoadingNotification);
        setDetailsText(ErrorLoadingNotification);
        return;
      }
    }

    return push(
      <AuthorFeed
        showNavDropdown={false}
        previousViewTitle={buildTitle(previousViewTitle, ViewNotificationsNavigationTitle)}
        authorHandle={notification.author.handle}
      />,
    );
  };

  const notificationItem = (notification: Notification) => {
    return (
      <List.Item
        key={notification.id}
        id={notification.id}
        icon={{ source: notification.author.avatarUrl ? notification.author.avatarUrl : Icon.ChessPiece }}
        detail={<List.Item.Detail markdown={detailsText} />}
        accessories={getNotificationAccessory(notification)}
        title={`${getAccountName(notification.author)} ${notification.text}`}
        actions={
          <ActionPanel>
            <Action
              title={ViewNotification}
              icon={{ source: Icon.Alarm, tintColor: Color.Blue }}
              onAction={() => (showDetails ? setShowDetails(false) : openNotification(notification))}
            />
            <Action
              icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
              title={MarkNotificationsAsRead}
              onAction={onMarkNotificationsAsReadSelected}
            />
            <HomeAction />
          </ActionPanel>
        }
      />
    );
  };

  const getNotificationAccessory = (notification: Notification) => {
    const accessories: List.Item.Accessory[] = [
      {
        text:
          selectedNotificationId == notification.id
            ? `${getFormattedDateTime(notification.indexedAtDate)}`
            : `${getRelativeDateTime(notification.indexedAtDate)}`,
      },
    ];

    if (!notification.isRead) {
      accessories.push({
        icon: Icon.AlarmRinging,
      });
    }

    return accessories;
  };

  return sessionStartFailed ? (
    <Error
      errorMessage={errorMessage}
      navigationTitle={buildTitle(previousViewTitle, ViewNotificationsNavigationTitle)}
    />
  ) : (
    <List
      isLoading={notifications.length === 0}
      isShowingDetail={showDetails}
      onSelectionChange={onSelectionChange}
      navigationTitle={notificationsLoaded ? notificationText : ViewNotificationsNavigationTitle}
      searchBarPlaceholder={ViewNotificationsSearchBarPlaceholder}
      searchBarAccessory={<NavigationDropdown currentViewId={2} />}
      actions={
        <ActionPanel>
          <HomeAction />
        </ActionPanel>
      }
    >
      <List.Section title={UnreadNotificationSectionTitle}>
        {notifications
          .filter((notifications) => !notifications.isRead)
          .map((notification) => notificationItem(notification))}
      </List.Section>
      <List.Section title={ReadNotificationSectionTitle}>
        {notifications
          .filter((notifications) => notifications.isRead)
          .map((notification) => notificationItem(notification))}
      </List.Section>
    </List>
  );
}
