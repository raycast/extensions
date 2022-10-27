import { Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getGitHubAPI, Notification } from "../github";
import { getErrorMessage } from "../utils";

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

function NotificationItem(props: { notification: Notification }): JSX.Element {
  const n = props.notification;
  return (
    <List.Item
      title={n.subject.title}
      subtitle={n.reason}
      icon={{ value: { source: getIcon(n), tintColor: Color.PrimaryText }, tooltip: n.subject.type }}
      accessories={[{ date: new Date(n.updated_at) }]}
    />
  );
}

export function NotificationsList(): JSX.Element {
  const { notifications, error, isLoading } = useNotifications();
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not fetch Notifications", message: error });
  }
  const unread = notifications?.filter((n) => n.unread);
  const read = notifications?.filter((n) => !n.unread);
  return (
    <List isLoading={isLoading}>
      <List.Section title="Unread">
        {unread?.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </List.Section>
      <List.Section title="Read">
        {read?.map((n) => (
          <NotificationItem key={n.id} notification={n} />
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
} {
  const [notifications, setPrs] = useState<Notification[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function fetchData() {
      setIsLoading(true);
      setError(undefined);
      try {
        const octokit = getGitHubAPI();
        const d = await octokit.rest.activity.listNotificationsForAuthenticatedUser({ all: true });
        console.log(d.data[0].repository.full_name);
        const data = d.data?.map((n) => {
          return n as Notification;
        });
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
  }, []);

  return { notifications, error, isLoading };
}
