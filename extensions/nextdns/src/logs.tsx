import { Action, ActionPanel, getPreferenceValues, Icon, List, openCommandPreferences } from "@raycast/api";
import { getLogs } from "./libs/api";
import { getDeviceTag, getIconById, getStatusTag } from "./libs/utils";
import { Log } from "./types";

export default function Logs() {
  const { data, isLoading, revalidate } = getLogs();
  const { hideDeviceNames } = getPreferenceValues<Preferences.Logs>();

  return (
    <List isLoading={isLoading}>
      {data.map((log: Log) => {
        const date = new Date(log.timestamp);
        return (
          <List.Item
            title={log.domain}
            icon={getIconById(log.domain)}
            accessories={[
              { tag: getStatusTag(log.status) },
              ...(hideDeviceNames ? [] : [getDeviceTag(log.device)]),
              { date: date, tooltip: date.toLocaleDateString() },
            ]}
            actions={
              <ActionPanel>
                <Action title="Reload" icon={Icon.RotateClockwise} onAction={revalidate} />
                <Action
                  title="Open Command Preferences"
                  onAction={openCommandPreferences}
                  icon={Icon.Gear}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
