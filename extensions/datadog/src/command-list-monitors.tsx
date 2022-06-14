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
import { useEffect, useState } from "react";
import { monitorsApi } from "./datadog-api";
import { MonitorSearchResponse } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/MonitorSearchResponse";
import { showError, linkDomain } from "./util";

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

type State = {
  monitorsAreLoading: boolean;
  response?: MonitorSearchResponse;
};

// noinspection JSUnusedGlobalSymbols
export default function CommandListMonitors() {
  const [{ monitorsAreLoading, response }, setState] = useState<State>({
    response: undefined,
    monitorsAreLoading: true,
  });

  const search = (query: string) => {
    console.log("searching for monitors", query);
    setState(prev => ({ ...prev, monitorsAreLoading: true }));
    monitorsApi
      .searchMonitors({ query, page: 0, perPage: 50 })
      .then(x => setState(prev => ({ ...prev, response: x, monitorsAreLoading: false })))
      .catch(showError);
  };

  useEffect(() => {
    search("");
  }, []);

  const getCountSummary = () => {
    if (!response) return "";
    return ", " + response!.counts!.status!.map(x => `${x.count} ${x.name}`).join(", ");
  };
  return (
    <List isLoading={monitorsAreLoading} onSearchTextChange={search} throttle>
      <List.Section title={`Available monitors ${response?.metadata?.totalCount}${getCountSummary()}`}>
        {response
          ? response!.monitors!.map(monitor => (
              <List.Item
                key={monitor.id}
                title={monitor.name || monitor.query!}
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
