import { ActionPanel, List, OpenInBrowserAction, getPreferenceValues } from "@raycast/api";
import { linkDomain } from "./util";
import fetch from "node-fetch";
import { DashboardSummaryDefinition } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/DashboardSummaryDefinition";
import { useEffect, useState } from "react";

type State = {
  dashboardsAreLoading: boolean;
  dashboards: DashboardSummaryDefinition[];
};

type DashboardSearchApiResponse = {
  total: number;
  dashboards: DashboardSummaryDefinition[];
};

export default function CommandListDashboards() {
  const [{ dashboardsAreLoading, dashboards }, setState] = useState<State>({
    dashboards: [],
    dashboardsAreLoading: true,
  });
  const search = (query: string) => {
    console.log("searching for dashboards", query);
    fetch(
      encodeURI(
        `https://app.datadoghq.com/api/v1/dashboard_search?with_suggested=true&query=${query}&start=0&count=50&sort=`
      ),
      {
        headers: {
          "DD-API-KEY": getPreferenceValues()["api-key"],
          "DD-APPLICATION-KEY": getPreferenceValues()["app-key"],
        },
      }
    )
      .then(res => res.json())
      .then(data => {
        setState(prev => ({ ...prev, dashboards: (data as DashboardSearchApiResponse).dashboards }));
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => setState(prev => ({ ...prev, dashboardsAreLoading: false })));
  };

  useEffect(() => {
    search("");
  }, []);

  return (
    <List isLoading={dashboardsAreLoading} onSearchTextChange={search}>
      {dashboards.map(dashboard => (
        <List.Item
          key={dashboard.id}
          icon={{ source: { light: "icon@light.png", dark: "icon@dark.png" } }}
          title={dashboard.title || "No title"}
          subtitle={dashboard.description?.replace("\n", "")}
          accessoryTitle={dashboard.authorHandle}
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={`https://${linkDomain()}${dashboard.url}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
