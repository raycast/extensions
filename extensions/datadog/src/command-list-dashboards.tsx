import { ActionPanel, getPreferenceValues, List, OpenInBrowserAction } from "@raycast/api";
import { useDashboards } from "./useDashboards";

// noinspection JSUnusedGlobalSymbols
export default function CommandListDashboards() {
  const { dashboards, dashboardsAreLoading } = useDashboards();

  const SERVER = getPreferenceValues()["server"];

  return (
    <List isLoading={dashboardsAreLoading}>
      {dashboards.map(dashboard => (
        <List.Item
          key={dashboard.id}
          icon={{ source: { light: "icon@light.png", dark: "icon@dark.png" } }}
          title={dashboard.title || "No title"}
          subtitle={dashboard.description?.replace("\n", "")}
          accessoryTitle={dashboard.authorHandle}
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={`https://app.${SERVER}${dashboard.url}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
