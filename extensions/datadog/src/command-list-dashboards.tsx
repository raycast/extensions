import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useDashboards } from "./useDashboards";
import { linkDomain } from "./util";
import { clearLocalState } from "./cache";

// noinspection JSUnusedGlobalSymbols
export default function CommandListDashboards() {
  const { state, dashboardsAreLoading } = useDashboards();

  return (
    <List isLoading={dashboardsAreLoading}>
      {state.dashboards.map(dashboard => (
        <List.Item
          key={dashboard.id}
          icon={{ source: { light: "icon@light.png", dark: "icon@dark.png" } }}
          title={dashboard.title || "No title"}
          subtitle={dashboard.description?.replace("\n", "")}
          accessoryTitle={dashboard.authorHandle}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://${linkDomain()}${dashboard.url}`} />
              <Action icon={Icon.Trash} title="Clear dashboards cache" onAction={() => clearLocalState("dashboards")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
