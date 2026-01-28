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
import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { linkDomain } from "./util";
import { useMonitors } from "./useMonitors";
import { MonitorSearchResponse } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/MonitorSearchResponse";
import { MonitorSearchResult } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/MonitorSearchResult";

// noinspection JSUnusedGlobalSymbols
export default function CommandListMonitors() {
  const [query, setQuery] = useState("");
  const { monitorResponse, monitorsAreLoading } = useMonitors(query);

  return (
    <List isLoading={monitorsAreLoading} onSearchTextChange={setQuery} throttle>
      <List.Section title={availableMonitorsSummary(monitorResponse)}>
        {monitorResponse && monitorResponse.monitors ? monitorResponse.monitors.map(mapMonitor) : null}
      </List.Section>
    </List>
  );
}

const mapMonitor = ({ id, name, query, tags, status }: MonitorSearchResult) => (
  <List.Item
    key={id}
    title={name || query || ""}
    subtitle={tags?.join(", ")}
    accessories={[{ text: status as string, icon: { source: statusIcon(status) } }]}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser url={`https://${linkDomain()}/monitors/${id}`} />
        <Action.CopyToClipboard content={`https://${linkDomain()}/monitors/${id}`} />
      </ActionPanel>
    }
  />
);

type OptionalMonitorSearchResponse = MonitorSearchResponse | undefined;

const availableMonitorsSummary = (monitorResponse: OptionalMonitorSearchResponse) =>
  `Available monitors ${totalCount(monitorResponse)}, ${countSummary(monitorResponse)}`;

const totalCount = (monitorResponse: OptionalMonitorSearchResponse) => monitorResponse?.metadata?.totalCount;

const countSummary = (monitorResponse: OptionalMonitorSearchResponse) =>
  monitorResponse?.counts?.status
    ? monitorResponse.counts.status.map(({ count, name }) => `${count} ${name}`).join(", ")
    : "";

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
