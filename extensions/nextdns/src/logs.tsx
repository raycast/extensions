import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getLogs } from "./libs/api";
import { getIconById } from "./libs/utils";
import { Log } from "./types";

export default function Logs() {
  const { data, isLoading, revalidate } = getLogs();

  return (
    <List isLoading={isLoading}>
      {data.map((log: Log) => {
        const date = new Date(log.timestamp);
        return (
          <List.Item
            title={log.domain}
            icon={getIconById(log.domain)}
            accessories={[
              { tag: log.device.name, tooltip: log.device.model },
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
