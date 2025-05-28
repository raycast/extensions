import { Action, ActionPanel, Icon, LaunchType, Toast, launchCommand, open, showToast } from "@raycast/api";
import { MutatePromise, usePromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { getErrorMessage } from "../helpers/errors";
import { getGitHubURL, getNotificationSubtitle, getNotificationTypeTitle } from "../helpers/notifications";
import { NotificationWithIcon } from "../notifications";

type NotificationActionsProps = {
  notification: NotificationWithIcon;
  userId?: string;
  mutateList: MutatePromise<NotificationWithIcon[] | undefined>;
};

export default function NotificationActions({ notification, userId, mutateList }: NotificationActionsProps) {
  const { octokit } = getGitHubClient();

  const { data: url } = usePromise(
    (notification, userId) => getGitHubURL(notification, userId),
    [notification, userId],
  );

  async function markNotificationAsRead() {
    await showToast({ style: Toast.Style.Animated, title: "Marking notification as read" });

    try {
      await octokit.activity.markThreadAsRead({ thread_id: parseInt(notification.id) });
      await mutateList();
      await launchCommand({ name: "unread-notifications", type: LaunchType.UserInitiated });

      await showToast({
        style: Toast.Style.Success,
        title: "Marked notification as read",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed marking notification as read",
        message: getErrorMessage(error),
      });
    }
  }

  async function markNotificationAsDone() {
    await showToast({ style: Toast.Style.Animated, title: "Marking notification as done" });

    try {
      await octokit.activity.markThreadAsDone({ thread_id: parseInt(notification.id) });
      await mutateList();
      await launchCommand({ name: "unread-notifications", type: LaunchType.UserInitiated });

      await showToast({
        style: Toast.Style.Success,
        title: "Marked notification as done",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed marking notification as done",
        message: getErrorMessage(error),
      });
    }
  }

  async function openNotification(isUnreadNotification: boolean) {
    try {
      if (url) {
        await open(url);
      }

      if (isUnreadNotification) {
        await octokit.activity.markThreadAsRead({ thread_id: parseInt(notification.id) });
        await mutateList();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed opening notification",
        message: getErrorMessage(error),
      });
    }
  }

  async function acceptInvitation() {
    try {
      const invitations = await octokit.repos.listInvitationsForAuthenticatedUser();

      const invitation = invitations.data.find(
        (invitation: { repository: { url: string } }) => invitation.repository.url === notification.repository.url,
      );

      await octokit.repos.acceptInvitationForAuthenticatedUser({
        invitation_id: invitation?.id || 0,
      });

      open(notification.repository.html_url);
      await mutateList();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed opening notification",
        message: getErrorMessage(error),
      });
    }
  }

  async function markAllNotificationsAsRead() {
    await showToast({ style: Toast.Style.Animated, title: "Marking all notifications as read" });

    try {
      await octokit.activity.markNotificationsAsRead();
      await mutateList();
      await launchCommand({ name: "unread-notifications", type: LaunchType.UserInitiated });

      await showToast({
        style: Toast.Style.Success,
        title: "Marked all notifications as read",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed marking all notification as read",
        message: getErrorMessage(error),
      });
    }
  }

  async function unsubscribe() {
    await showToast({ style: Toast.Style.Animated, title: "Unsubscribing" });

    try {
      await octokit.activity.deleteThreadSubscription({ thread_id: parseInt(notification.id) });
      await mutateList();

      await showToast({
        style: Toast.Style.Success,
        title: "Unsubscribed",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed unsubscribing",
        message: getErrorMessage(error),
      });
    }
  }

  const isRepoInvitation = notification.subject.type === "RepositoryInvitation";

  return (
    <ActionPanel title={getNotificationSubtitle(notification)}>
      <Action
        title={isRepoInvitation ? "Accept Invitation" : "Open in Browser"}
        icon={Icon.Globe}
        onAction={() => (isRepoInvitation ? acceptInvitation() : openNotification(notification.unread))}
      />
      {notification.unread ? (
        <>
          <Action title="Mark as Read" icon={Icon.Circle} onAction={markNotificationAsRead} />

          <Action
            title="Mark All as Read"
            icon={Icon.Circle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onAction={markAllNotificationsAsRead}
          />
        </>
      ) : null}

      <Action
        title="Mark as Done"
        icon={Icon.Circle}
        onAction={markNotificationAsDone}
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      />

      <Action
        title="Unsubscribe"
        icon={Icon.BellDisabled}
        shortcut={{ modifiers: ["cmd"], key: "." }}
        onAction={unsubscribe}
      />
      <ActionPanel.Section>
        {url ? (
          <Action.CopyToClipboard
            content={url}
            title={`Copy ${getNotificationTypeTitle(notification)} URL`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          />
        ) : null}

        <Action.CopyToClipboard
          content={notification.subject.title}
          title={`Copy ${getNotificationTypeTitle(notification)} Title`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          icon={Icon.ArrowClockwise}
          title="Refresh"
          onAction={mutateList}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
