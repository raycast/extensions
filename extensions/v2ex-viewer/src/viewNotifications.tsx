import { List, Icon } from "@raycast/api";
import { getUnixFromNow } from "@/utils/time";
import { useFetch } from "@raycast/utils";
import { getToken } from "@/utils/preference";
import { Response, Notification } from "@/types/v2ex";
import { showLoadingToast, showFailedToast, showSuccessfulToast } from "./utils/toast";

const getDetail = (text: string) => {
  const regex = text.includes("›")
    ? /(?<behavior>[^ ]+) › <a[^<>]+?>(?<topicTitle>[^<>]+)/gm
    : /[^>]+?>(?<topicTitle>[^<>]+)<\/a> \W(?<behavior>[^<>]+)/gm;
  const match = regex.exec(text);
  try {
    return match?.groups;
  } catch (error) {
    return null;
  }
};

export default function Command() {
  const token = getToken();
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
  return (
    <List>
      {notifications.data?.result &&
        notifications.data.result.map(({ created, text, member, payload }) => {
          const { topicTitle, behavior } = getDetail(text) || {};
          if (text.includes("›")) {
            return (
              <List.Item
                title={"❤️   " + member.username}
                subtitle={behavior + " › " + topicTitle}
                accessories={[{ tag: getUnixFromNow(created) }]}
              />
            );
          }
          return (
            <List.Section title={topicTitle}>
              <List.Item
                title={"✏️   " + member.username}
                subtitle={behavior + " : " + payload}
                accessories={[{ tag: getUnixFromNow(created) }]}
              />
            </List.Section>
          );
        })}
    </List>
  );
}
