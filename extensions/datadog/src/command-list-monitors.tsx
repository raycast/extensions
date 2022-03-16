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
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useMonitors, clearLocalState, Caches } from "./fetchers";
import { linkDomain } from "./utils";

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

// add types
const MonitorStatusDropdown = ({ value, onValueChange }) => {
  const states = [OK, ALERT, WARN, NO_DATA, UNKNOWN, IGNORED, SKIPPED];
  return (
    <List.Dropdown tooltip="Monitor state" value={value} storeValue={true} onChange={val => onValueChange(val)}>
      {states.map(state => (
        <List.Dropdown.Item key={state} title={state} value={state} />
      ))}
    </List.Dropdown>
  );
};

// noinspection JSUnusedGlobalSymbols
export default function CommandListMonitors() {
  const { state, monitorsAreLoading } = useMonitors();
  const [stateFilter, setStateFilter] = useState("");
  const [filteredMonitors, setFilteredMonitors] = useState([]);

  // add types
  const filterMonitorsByState = (monitors, state) => {
    if (state === "") {
      return monitors;
    }
    return monitors.filter(monitor => monitor.overallState === state);
  };

  useEffect(() => {
    setFilteredMonitors(filterMonitorsByState(state.monitors, stateFilter));
  }, [stateFilter, state]);

  return (
    <List
      isLoading={monitorsAreLoading}
      searchBarAccessory={<MonitorStatusDropdown value={""} onValueChange={setStateFilter} />}
    >
      {filteredMonitors.map(monitor => (
        <List.Item
          key={monitor.id}
          icon={{ source: { light: "icon@light.png", dark: "icon@dark.png" } }}
          title={monitor.name || monitor.query}
          subtitle={monitor.tags?.join(", ")}
          accessoryTitle={monitor.overallState}
          accessoryIcon={{ source: statusIcon(monitor.overallState) }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://${linkDomain()}/monitors/${monitor.id}`} />
              <Action
                icon={Icon.Trash}
                title="Clear monitors cache"
                onAction={() => clearLocalState(Caches.Monitors)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
