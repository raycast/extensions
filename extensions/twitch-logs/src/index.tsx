import { List, LaunchProps, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { randomUUID } from "crypto";

interface LogArguments {
  channel: string;
  user: string;
  month: string;
}

export default function Command(props: LaunchProps<{ arguments: LogArguments }>) {
  const { channel, user } = props.arguments;
  const date = new Date();
  const year = date.getFullYear();
  const month = props.arguments.month || date.getMonth() + 1;

  const { data, isLoading } = useFetch(
    `https://logs.ivr.fi/channel/${channel}/user/${user}/${year}/${month}?reverse=1`
  );

  if (!data) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Filter Messages...">
        <List.Section title="Results" subtitle={`${user} messages in ${channel}'s chat`}>
          <List.Item title={isLoading ? "Searching for logs" : "No logs found..."} />
        </List.Section>
      </List>
    );
  }

  const stringLines = (data as string) || "No Logs Found\n...";
  const lines = stringLines.split("\n");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter Messages..." throttle>
      <List.Section title="Results" subtitle={`Showing ${user}'s messages in ${channel}'s chat for ${year}/${month}`}>
        {lines.map(
          (message: string) =>
            parseLog(message) && (
              <List.Item
                key={randomUUID()}
                icon={
                  isImage(parseLog(message)?.message ?? "Unknown message")
                    ? { source: Icon.Image, tintColor: Color.Green }
                    : isLink(parseLog(message)?.message ?? "Unknown message")
                    ? { source: Icon.Link, tintColor: Color.Blue }
                    : { source: Icon.Message }
                }
                title={parseLog(message)?.message ?? "Unknown message"}
                accessories={[
                  {
                    text: parseLog(message)?.time ?? "Unknown Time",
                    icon: { tintColor: Color.Red, source: Icon.Clock },
                  },
                  {
                    text: parseLog(message)?.date ?? "Unknown Date",
                    icon: { tintColor: Color.Blue, source: Icon.Calendar },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Message"
                      content={parseLog(message)?.message ?? "Unknown message"}
                    />
                  </ActionPanel>
                }
              ></List.Item>
            )
        )}
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
  const regex = /\[(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})\] #(\w+) (\w+): (.*)/g;
  const match = regex.exec(log);
  if (match) {
    const [, date, time, channel, user, message] = match;
    const dateWithoutYear = date.slice(5);
    const timeWithoutSeconds = time.slice(0, -3);

    const chatLog = {
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

interface Log {
  date: string;
  time: string;
  channel: string;
  user: string;
  message: string;
}
