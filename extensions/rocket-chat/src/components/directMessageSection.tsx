import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { DirectMessage } from "../models/user";
import { getConfig } from "../config";

export function DirectMessageSection({ directMessages }: { directMessages: DirectMessage[] }) {
  const config = getConfig();

  return (
    <>
      {directMessages.length >= 1 && (
        <List.Section title="Direct Messages">
          {directMessages.map((directMessage) => (
            <List.Item
              key={directMessage._id}
              icon={
                directMessage.isGroupChat
                  ? Icon.TwoPeople
                  : `${config.baseUrl}/avatar/${directMessage.involvedUsers[0]?.username}?size=50`
              }
              title={directMessage.involvedUsers.map((user) => user.username).join(", ")}
              accessories={
                !directMessage.isGroupChat
                  ? [
                      {
                        text: {
                          value: directMessage.involvedUsers[0]?.status,
                          color:
                            directMessage.involvedUsers[0]?.status === "online"
                              ? Color.Green
                              : directMessage.involvedUsers[0]?.status === "busy"
                                ? Color.Red
                                : directMessage.involvedUsers[0]?.status === "away"
                                  ? Color.Yellow
                                  : Color.SecondaryText,
                        },
                      },
                    ]
                  : undefined
              }
              actions={
                <ActionPanel title={directMessage.involvedUsers.map((user) => user.username).join(", ")}>
                  <Action.OpenInBrowser title="Chat" url={`${config.baseUrl}/direct/${directMessage._id}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </>
  );
}
