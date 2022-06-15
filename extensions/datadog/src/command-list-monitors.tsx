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
import {  useState } from "react";
import { linkDomain } from "./util";
import {useMonitors} from "./useMonitors";

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
  const [query, setQuery] = useState("");
  const {monitorResponse, monitorsAreLoading} = useMonitors(query);

  const getCountSummary = () => {
    if (!monitorResponse || !monitorResponse.counts || !monitorResponse.counts.status) return "";
    return ", " + monitorResponse.counts.status.map(x => `${x.count} ${x.name}`).join(", ");
  };
  return (
    <List isLoading={monitorsAreLoading} onSearchTextChange={setQuery} throttle>
      <List.Section title={`Available monitors ${monitorResponse?.metadata?.totalCount}${getCountSummary()}`}>
        {monitorResponse && monitorResponse.monitors
          ? monitorResponse.monitors.map(monitor => (
              <List.Item
                key={monitor.id}
                title={monitor.name || monitor.query || query}
                subtitle={monitor.tags?.join(", ")}
                accessoryTitle={monitor.status}
                accessoryIcon={{ source: statusIcon(monitor.status) }}
                actions={
                  <ActionPanel>
                    <OpenInBrowserAction url={`https://${linkDomain()}/monitors/${monitor.id}`} />
                  </ActionPanel>
                }
              />
            ))
          : null}
      </List.Section>
    </List>
  );
}
