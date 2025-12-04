import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { UserStatus } from "./models/user";
import { getStatus, setStatus } from "./actions/rocketchat-api";
import { getConfig } from "./config";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);

  const config = getConfig();

  const [currentStatus, setCurrentStatus] = useState<UserStatus | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setCurrentStatus(null);

      try {
        const status = await getStatus(config.userId);

        setCurrentStatus(status);
        setIsLoading(false);
      } catch {
        setCurrentStatus(null);
        setIsLoading(false);
      }
    })();
  }, []);

  async function updateUserStatus(status: UserStatus) {
    setCurrentStatus(status);
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="User Status">
        <List.Item
          icon={{ source: Icon.Circle, tintColor: Color.Green }}
          title="Online"
          subtitle={currentStatus === "online" ? "Current status" : undefined}
          actions={
            <ActionPanel>
              <Action title="Set Status" onAction={() => setStatus("online", updateUserStatus)} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
          title="Away"
          subtitle={currentStatus === "away" ? "Current status" : undefined}
          actions={
            <ActionPanel>
              <Action title="Set Status" onAction={() => setStatus("away", updateUserStatus)} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Circle, tintColor: Color.Red }}
          title="Busy"
          subtitle={currentStatus === "busy" ? "Current status" : undefined}
          actions={
            <ActionPanel>
              <Action title="Set Status" onAction={() => setStatus("busy", updateUserStatus)} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
          title="Offline"
          subtitle={currentStatus === "offline" ? "Current status" : undefined}
          actions={
            <ActionPanel>
              <Action title="Set Status" onAction={() => setStatus("offline", updateUserStatus)} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
