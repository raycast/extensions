import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getLogs } from "./libs/api";
import { getIconById } from "./libs/utils";
import { Log } from "./types";

export default function Logs() {
  const { data, isLoading, revalidate } = getLogs();

  return (
    <List isLoading={isLoading}>
      {data.map((log: Log) => {
        console.log(log);
        const date = new Date(log.timestamp);
        return (
          <List.Item
            title={log.domain}
            icon={getIconById(log.domain)}
            accessories={[
              {
                tag:
                  log.status === "blocked"
                    ? { value: "Blocked", color: Color.Red }
                    : log.status === "allowed"
                      ? { value: "Allowed", color: Color.Green }
                      : null,
              },
              { tag: log.device ? log.device.name : "Unknown", tooltip: log.device ? log.device.model : "No model" },
              { date: date, tooltip: date.toLocaleDateString() },
            ]}
            actions={
              <ActionPanel>
                <Action title="Reload" icon={Icon.RotateClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
