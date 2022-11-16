import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getGitHubAPI, Notification } from "../github";
import { capitalizeFirstLetter, getErrorMessage } from "../utils";

function getIcon(notification: Notification): string {
  const t = notification.subject.type;
  if (t === "Issue") {
    return "exclamation.png";
  } else if (t === "PullRequest") {
    return "propen.png";
  } else if (t === "Discussion") {
    return "discussion.png";
  }
  return Icon.QuestionMark;
}

function NotificationMarkAsReadAction(props: {
  notification: Notification;
  performRefetch?: () => void;
}): JSX.Element | null {
  const n = props.notification;
  if (!props.performRefetch || !n.unread) {
    return null;
  }
  const handle = async () => {
    try {
      const octokit = getGitHubAPI();
      await octokit.rest.activity.markThreadAsRead({ thread_id: Number(n.id) });
      showToast({ style: Toast.Style.Success, title: "Marked as Read" });
    } catch (error) {
      const et = getErrorMessage(error);
      showToast({ style: Toast.Style.Failure, title: "Could not mark all Notifications as Read", message: et });
    } finally {
      if (props.performRefetch) {
        props.performRefetch();
      }
    }
  };
  return (
    <Action
      title="Mark as Read"
      icon={{ source: Icon.Circle, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "enter" }}
      onAction={handle}
    />
  );
}

function NotificationMarkAllAsReadAction(props: {
  notification: Notification;
  performRefetch?: () => void;
}): JSX.Element | null {
  const n = props.notification;
  if (!props.performRefetch || !n.unread) {
    return null;
  }
  const handle = async () => {
    try {
      const octokit = getGitHubAPI();
      await octokit.rest.activity.markNotificationsAsRead({ read: true });
      showToast({ style: Toast.Style.Success, title: "Marked All as Read" });
    } catch (error) {
      const et = getErrorMessage(error);
      showToast({ style: Toast.Style.Failure, title: "Could not mark all Notifications as Read", message: et });
    } finally {
      if (props.performRefetch) {
        props.performRefetch();
      }
    }
  };
  return (
    <Action
      title="Mark All as Read"
      icon={{ source: Icon.Circle, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      onAction={handle}
    />
  );
}

function NotificationOpenInBrowserAction(props: { notification: Notification }): JSX.Element | null {
  const n = props.notification;
  if (!n.html_url) {
    return null;
  }
  return <Action.OpenInBrowser url={n.html_url} />;
}

function NotificationsRefreshAction(props: { performRefetch?: () => void }): JSX.Element | null {
  if (props.performRefetch) {
    return (
      <Action
        title="Refresh"
        icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={props.performRefetch}
      />
    );
  }
  return null;
}

function NotificationItem(props: { notification: Notification; performRefetch?: () => void }): JSX.Element {
  const n = props.notification;
  return (
    <List.Item
      title={n.subject.title}
      subtitle={capitalizeFirstLetter(n.reason)}
      icon={{ value: { source: getIcon(n), tintColor: Color.PrimaryText }, tooltip: n.subject.type }}
      accessories={[{ date: new Date(n.updated_at) }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`${capitalizeFirstLetter(n.reason)}`}>
            <NotificationOpenInBrowserAction notification={n} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <NotificationMarkAsReadAction notification={n} performRefetch={props.performRefetch} />
            <NotificationMarkAllAsReadAction notification={n} performRefetch={props.performRefetch} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <NotificationsRefreshAction performRefetch={props.performRefetch} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function NotificationsList(): JSX.Element {
  const { notifications, error, isLoading, performRefetch } = useNotifications();
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not fetch Notifications", message: error });
  }
  const unread = notifications?.filter((n) => n.unread);
  const read = notifications?.filter((n) => !n.unread);
  return (
    <List isLoading={isLoading}>
      <List.Section title="Unread">
        {unread?.map((n) => (
          <NotificationItem key={n.id} notification={n} performRefetch={performRefetch} />
        ))}
      </List.Section>
      <List.Section title="Read">
        {read?.map((n) => (
          <NotificationItem key={n.id} notification={n} performRefetch={performRefetch} />
        ))}
      </List.Section>
      <List.EmptyView title="No Notifications" />
    </List>
  );
}

function useNotifications(): {
  notifications: Notification[] | undefined;
  error?: string;
  isLoading: boolean;
  performRefetch: () => void;
} {
  const [notifications, setPrs] = useState<Notification[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [timestamp, setTimestamp] = useState<Date>(new Date());

  const performRefetch = () => {
    setTimestamp(new Date());
  };

  useEffect(() => {
    let cancel = false;
    async function fetchData() {
      setIsLoading(true);
      setError(undefined);
      try {
        const octokit = getGitHubAPI();
        const d = await octokit.rest.activity.listNotificationsForAuthenticatedUser({ all: true });
        const data = d.data?.map((n) => {
          return n as Notification;
        });
        for (const e of data) {
          // NOTE Not a solid way to get the info, but save a lot of requests
          if (e.subject.url && e.subject.url.includes("https://api.github.com/repos")) {
            const html_url = e.subject.url.replace("https://api.github.com/repos", "https://github.com");
            e.html_url = html_url;
          }
        }
        if (!cancel) {
          setPrs(data);
        }
      } catch (error) {
        setError(getErrorMessage(error));
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }
    fetchData();

    return () => {
      cancel = true;
    };
  }, [timestamp]);

  return { notifications, error, isLoading, performRefetch };
}
