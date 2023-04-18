import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import {
  BlueskyImageEmbedType,
  ErrorLoadingNotification,
  LoadingNotificationContent,
  MarkNotificationsAsRead,
  MarkNotificationsAsReadAlert,
  NewNotification,
  NewNotifications,
  NoNewNotifications,
  NotificationCacheKey,
  NotificationsReadToast,
  ViewNotification,
  ViewNotificationsNavigationTitle,
  ViewNotificationsSearchBarPlaceholder,
  ViewingNotification,
} from "./utils/constants";
import { buildTitle, showLoadingToast, showSuccessToast } from "./utils/common";
import { getFormattedDateTime, getRelativeDateTime } from "./utils/date";
import { getNotifications, getPostThread, getUnreadNotificationCount, markNotificationsAsRead } from "./libs/atp";
import { getPostMarkdownView, parseNotifications } from "./utils/parser";
import { useEffect, useState } from "react";

import AuthorFeed from "./components/feed/AuthorFeed";
import Error from "./components/error/Error";
import { ExtensionConfig } from "./config/config";
import HomeAction from "./components/actions/HomeAction";
import NavigationDropdown from "./components/nav/NavigationDropdown";
import { Notification } from "./types/types";
import Onboard from "./components/onboarding/Onboard";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { ViewImage } from "@atproto/api/dist/client/types/app/bsky/embed/images";
import { confirmAlert } from "@raycast/api";
import { showDangerToast } from "./utils/common";
import { useCachedState } from "@raycast/utils";
import useStartATSession from "./hooks/useStartATSession";

interface ViewNotificationProps {
  previousViewTitle?: string;
}

export default function ViewNotifications({ previousViewTitle = "" }: ViewNotificationProps) {
  const [notifications, setNotifications] = useCachedState<Notification[]>(NotificationCacheKey, []);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const { push } = useNavigation();
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [detailsText, setDetailsText] = useState<string>("");
  const [firstFetch, setFirstFetch] = useState(true);

  const fetchNotifications = async () => {
    const data = await getNotifications(cursor, ExtensionConfig.notificationRequestLimit);

    if (!data) {
      return;
    }

    const posts = parseNotifications(data.notifications);

    if (data.cursor) {
      setCursor(data.cursor);
    }

    setNotifications((state) => {
      if (firstFetch) {
        state = [];
        setFirstFetch(false);
      }

      const existingIds = new Set(state.map((post) => post.id));
      const newPosts = posts.filter((post) => !existingIds.has(post.id));
      return [...state, ...newPosts];
    });
  };

  useEffect(() => {
    (async () => {
      if (sessionStarted) {
        fetchNotifications();

        const notificationCount = await getUnreadNotificationCount();
        if (notificationCount > 1) {
          showSuccessToast(`${notificationCount} ${NewNotifications}`);
        } else if (notificationCount == 1) {
          showSuccessToast(`${notificationCount} ${NewNotification}`);
        } else {
          showSuccessToast(NoNewNotifications);
        }
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
      await fetchNotifications();
    }
  };

  const onMarkNotificationsAsReadSelected = async () => {
    if (await confirmAlert({ title: MarkNotificationsAsReadAlert })) {
      await markNotificationsAsRead();
      showSuccessToast(NotificationsReadToast);
    }
  };

  const openNotification = async (notification: Notification) => {
    if (notification.targetPostUri) {
      showLoadingToast(LoadingNotificationContent);

      let uri = notification.targetPostUri;

      if (["reply", "quote", "mention"].includes(notification.reason)) {
        uri = notification.uri;
      }

      try {
        const responseData = await getPostThread(uri);
        if (!responseData || !responseData.thread || !responseData.thread.post) {
          return;
        }

        setShowDetails(true);

        let imageEmbeds: string[] = [];
        const post = responseData.thread.post as PostView;

        if (post.embed?.$type === BlueskyImageEmbedType) {
          imageEmbeds = (post.embed.images as ViewImage[]).map((item: ViewImage) => item.thumb);
        }

        setDetailsText(await getPostMarkdownView(post, imageEmbeds));
        showSuccessToast(ViewingNotification);

        return;
      } catch (error) {
        showDangerToast(ErrorLoadingNotification);
        return;
      }
    }

    return push(
      <AuthorFeed
        previousViewTitle={buildTitle(previousViewTitle, ViewNotificationsNavigationTitle)}
        authorHandle={notification.author.handle}
      />
    );
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
      navigationTitle={buildTitle(previousViewTitle, ViewNotificationsNavigationTitle)}
      searchBarPlaceholder={ViewNotificationsSearchBarPlaceholder}
      searchBarAccessory={<NavigationDropdown currentViewId={2} />}
      actions={
        <ActionPanel>
          <HomeAction />
        </ActionPanel>
      }
    >
      {notifications.map((notification) => (
        <List.Item
          key={notification.id}
          id={notification.id}
          icon={{ source: notification.author.avatarUrl }}
          detail={<List.Item.Detail markdown={detailsText} />}
          accessories={[
            {
              text:
                selectedNotificationId == notification.id
                  ? `${getFormattedDateTime(notification.indexedAtDate)}`
                  : `${getRelativeDateTime(notification.indexedAtDate)}`,
            },
          ]}
          title={`${notification.author.displayName} ${notification.text}`}
          actions={
            <ActionPanel>
              <Action
                title={ViewNotification}
                icon={{ source: Icon.Alarm, tintColor: Color.Blue }}
                onAction={() => openNotification(notification)}
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
      ))}
    </List>
  );
}
