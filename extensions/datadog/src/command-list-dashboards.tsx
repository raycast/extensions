import { ActionPanel, List, OpenInBrowserAction } from "@raycast/api";
import { useDashboards } from "./useDashboards";
import { linkDomain } from "./util";

// noinspection JSUnusedGlobalSymbols
export default function CommandListDashboards() {
  const { dashboards, dashboardsAreLoading } = useDashboards();

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
              <OpenInBrowserAction url={`https://${linkDomain()}${dashboard.url}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
