import { List, LaunchProps, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useId } from "react";
interface LogArguments {
  channel: string;
  user: string;
  month: string;
}
interface Log {
  fullDate: string;
  date: string;
  time: string;
  channel: string;
  user: string;
  message: string;
}
export default function Command(props: LaunchProps<{ arguments: LogArguments }>) {
  const { channel, user } = props.arguments;
  const date = new Date();
  const year = date.getFullYear();
  const month = props.arguments.month || date.getMonth() + 1;
  const { data, isLoading } = useFetch(
    `https://logs.ivr.fi/channel/${channel}/user/${user}/${year}/${month}?reverse=1`
  );
  const stringLines = (data as string) || "No Logs Found\n...";
  const lines = stringLines.split("\n");
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter Messages..." throttle>
      <List.EmptyView title="No logs found..." />
      <List.Section title="Results" subtitle={`Showing ${user}'s messages in ${channel}'s chat for ${year}/${month}`}>
        {lines.map((message: string) => {
          const parsedLog = parseLog(message);
          if (!parsedLog) return;
          const logDate = new Date(parsedLog.fullDate);
          return (
            parsedLog && (
              <List.Item
                key={useId()}
                icon={
                  isImage(parsedLog.message)
                    ? { source: Icon.Image, tintColor: Color.Green }
                    : isLink(parsedLog.message)
                    ? { source: Icon.Link, tintColor: Color.Blue }
                    : { source: Icon.Message }
                }
                title={parsedLog.message}
                accessories={[
                  {
                    icon: Icon.Calendar,
                    date: new Date(logDate),
                    tooltip: date.toLocaleString(),
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Message" content={parsedLog.message} />
                  </ActionPanel>
                }
              ></List.Item>
            )
          );
        })}
      </List.Section>
    </List>
  );
}
function isImage(link: string): boolean {
  const regex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/g;
  const match = regex.exec(link);
  if (match) {
    return true;
  }
  return false;
}
function isLink(message: string): boolean {
  const regex = /(https?:\/\/[^\s]+)/g;
  const match = regex.exec(message);
  if (match) {
    return true;
  }
  return false;
}
function parseLog(log: string): Log | null {
  // [2023-02-8 21:34:28] #xqc xqc: they tuck me in bruh
  const regex = /\[(\d{4}-\d{2}-\d{1,2}) (\d{2}:\d{2}:\d{2})\] #(\w+) (\w+): (.*)/g;
  const match = regex.exec(log);
  if (match) {
    const [, date, time, channel, user, message] = match;
    const dateWithoutYear = date.slice(5);
    const timeWithoutSeconds = time.slice(0, -3);
    const chatLog = {
      fullDate: `${date} ${time}`,
      date: dateWithoutYear,
      time: timeWithoutSeconds,
      channel: channel,
      user: user,
      message: message,
    };
    return chatLog;
  }
  return null;
}
