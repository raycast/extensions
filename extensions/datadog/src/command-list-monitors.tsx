import {
  MonitorOverallStates,
  ALERT,
  IGNORED,
  NO_DATA,
  OK,
  SKIPPED,
  UNKNOWN,
  WARN,
} from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/MonitorOverallStates";
import { ActionPanel, List, OpenInBrowserAction } from "@raycast/api";
import { useMonitors } from "./useMonitors";
import { linkDomain } from "./util";

const statusIcon = (status: MonitorOverallStates | undefined) => {
  const icon = (name: string, themable = false) => {
    if (themable) {
      return { light: `status/${name}@light.png`, dark: `status/${name}@dark.png` };
    }

    return { light: `status/${name}.png`, dark: `status/${name}.png` };
  };

  switch (status) {
    case OK:
      return icon("ok");
    case ALERT:
      return icon("error");
    case WARN:
      return icon("warn");
    case NO_DATA:
      return icon("nodata", true);
    case UNKNOWN:
      return icon("unknown", true);
    case IGNORED:
      return icon("paused", true);
    case SKIPPED:
      return icon("skipped", true);
  }

  return { light: "", dark: "" };
};

// noinspection JSUnusedGlobalSymbols
export default function CommandListMonitors() {
  const { monitors, monitorsAreLoading } = useMonitors();

  return (
    <List isLoading={monitorsAreLoading}>
      {monitors.map(monitor => (
        <List.Item
          key={monitor.id}
          icon={{ source: { light: "icon@light.png", dark: "icon@dark.png" } }}
          title={monitor.name || monitor.query}
          subtitle={monitor.tags?.join(", ")}
          accessoryTitle={monitor.overallState}
          accessoryIcon={{ source: statusIcon(monitor.overallState) }}
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={`https://${linkDomain()}/monitors/${monitor.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
