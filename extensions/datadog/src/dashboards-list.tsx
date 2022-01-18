import { ActionPanel, List, OpenInBrowserAction } from "@raycast/api";
import { useEffect, useState } from "react";
import { dashboardsApi } from "./datadog-api";
import {
  DashboardSummaryDefinition
} from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/DashboardSummaryDefinition";
import { showError } from "./util";


// noinspection JSUnusedGlobalSymbols
export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboards, setDashboards] = useState<DashboardSummaryDefinition[]>();

  useEffect(() => {
    dashboardsApi
      .listDashboards()
      .then(summary => setDashboards(summary.dashboards))
      .then(() => setIsLoading(false))
      .catch(showError);
  }, []);

  return <List isLoading={isLoading}>
    {dashboards?.map(dashboard => <List.Item
      key={dashboard.id}
      icon={{source: {light: "icon@light.png", dark: "icon@dark.png"}}}
      title={dashboard.title || "No title"}
      subtitle={dashboard.description?.replace("\n", "")}
      accessoryTitle={dashboard.authorHandle}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={`https://app.datadoghq.com${dashboard.url}`} />
        </ActionPanel>
      }
    />)}
  </List>;
}
