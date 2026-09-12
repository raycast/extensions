import { List, Icon, Action, ActionPanel, Color, confirmAlert, showToast, Toast } from "@raycast/api";
import { getUnixFromNow } from "@/utils/time";
import { useFetch } from "@raycast/utils";
import { getToken } from "@/utils/preference";
import { Response, Notification } from "@/types/v2ex";
import { showLoadingToast, showFailedToast, showSuccessfulToast } from "./utils/toast";
import fetch from "node-fetch";
const getDetail = (text: string) => {
  const regex = text.includes("›")
    ? /(?<behavior>[^ ]+) › <a href="(?<topicUrl>[^""]+)">(?<topicTitle>[^<>]+)/gm
    : /<a href="(?<topicUrl>[^""]+)[^>]+?>(?<topicTitle>[^<>]+)<\/a> \W(?<behavior>[^<>]+)/gm;
  const match = regex.exec(text);
  try {
    return match?.groups;
  } catch (error) {
    return null;
  }
};
const token = getToken();
const DeleteNotificationAction = ({ onDelete }: { onDelete: () => void }) => {
  return (
    <Action
      title="Delete"
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={async () => {
        await confirmAlert({
          title: "Warning",
          message: "Are you sure to delete this notification?",
          primaryAction: {
            title: "Detete",
            onAction: () => {
              onDelete();
            },
          },
        });
      }}
    />
  );
};
export default function Command() {
  const notifications = useFetch<Response<Notification[]>>("https://www.v2ex.com/api/v2/notifications", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    execute: !!token,
    keepPreviousData: true,
    onWillExecute: () => {
      showLoadingToast({ message: "/notifications" });
    },
    onError: (error) => {
      showFailedToast({ message: error.message || "" });
    },
    onData: (data) => {
      showSuccessfulToast({ message: data.message || "" });
    },
  });
  const deleteNotification = async (id: number) => {
    await showLoadingToast({ title: "Deleting", message: `/notifications/${id}` });
    try {
      await notifications.mutate(
        fetch(`https://www.v2ex.com/api/v2/notifications/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          method: "DELETE",
        }).then((res) => res.json()),
        {
          optimisticUpdate: (data) => {
            if (data?.result) {
              data.result = data.result.filter((item) => item.id !== id);
            }
            return data;
          },
          rollbackOnError: true,
          shouldRevalidateAfter: true,
        }
      );
      await showSuccessfulToast();
    } catch (error) {
      await showFailedToast();
      await notifications.revalidate();
    }
  };

  return (
    <List>
      {notifications.data?.result &&
        notifications.data.result.map(({ created, text, member, payload, id }) => {
          const { topicTitle, behavior, topicUrl } = getDetail(text) || {};
          if (text.includes("›")) {
            return (
              <List.Item
                title={"❤️   " + member.username}
                subtitle={behavior + " › " + topicTitle}
                accessories={[{ tag: getUnixFromNow(created) }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={`https://www.v2ex.com/${topicUrl}`} />
                    <DeleteNotificationAction
                      onDelete={() => {
                        deleteNotification(id);
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          }
          return (
            <List.Section title={""} subtitle={"   " + topicTitle}>
              <List.Item
                title={"✏️   " + member.username}
                subtitle={behavior + " : " + payload}
                accessories={[{ tag: getUnixFromNow(created) }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={`https://www.v2ex.com/${topicUrl}`} title="Open Related Topic" />
                    <Action.OpenInBrowser url={`https://www.v2ex.com/notifications`} title="View All Notifications" />
                    <DeleteNotificationAction
                      onDelete={() => {
                        deleteNotification(id);
                      }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          );
        })}
    </List>
  );
}
