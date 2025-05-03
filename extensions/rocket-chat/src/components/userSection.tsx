import { Action, ActionPanel, Color, List } from "@raycast/api";
import { User } from "../models/user";
import { createDirectMessage } from "../actions/rocketchat-api";
import { getConfig } from "../config";

export function UserSection({ users }: { users: User[] }) {
  const config = getConfig();

  return (
    <>
      {users.length >= 1 && (
        <List.Section title="Users">
          {users.map((user) => (
            <List.Item
              key={user._id}
              icon={`${config.baseUrl}/avatar/${user.username}?size=50`}
              title={user.username}
              accessories={[
                {
                  text: {
                    value: user.status ?? "test",
                    color:
                      user.status === "online"
                        ? Color.Green
                        : user.status === "busy"
                          ? Color.Red
                          : user.status === "away"
                            ? Color.Yellow
                            : Color.SecondaryText,
                  },
                },
              ]}
              actions={
                <ActionPanel title={user.username}>
                  <Action title="Chat" onAction={() => createDirectMessage(user)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </>
  );
}
