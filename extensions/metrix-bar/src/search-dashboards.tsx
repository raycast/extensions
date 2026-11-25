import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  type Image,
  Keyboard,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { AGENT_SETTINGS_URL, APP_URL, dashboardSettingsURL, dashboardURL } from "./lib/deeplinks";
import { getEmptyView } from "./lib/dashboard-state";
import { dashboardIconSource } from "./lib/dashboard-icons";
import { type Dashboard, fetchDashboards } from "./lib/metrix";

function CommonActions({ refresh }: { refresh: () => void }) {
  return (
    <ActionPanel.Section>
      <Action
        title="Refresh Dashboards"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
      <Action.Open title="Open Metrix.Bar" icon="icon.png" target={APP_URL} />
      <Action.Open title="Open Agent Settings" icon={Icon.Gear} target={AGENT_SETTINGS_URL} />
      <Action title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}

function DashboardActions({
  dashboard,
  icon,
  refresh,
}: {
  dashboard: Dashboard;
  icon: Image.ImageLike;
  refresh: () => void;
}) {
  const url = dashboardURL(dashboard);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Open
          title={dashboard.enabled ? "Open Panel" : "Open Dashboard Settings"}
          icon={dashboard.enabled ? icon : Icon.Gear}
          target={url}
        />
        {dashboard.enabled && (
          <>
            <Action.Open title="Open Dashboard Settings" icon={Icon.Gear} target={dashboardSettingsURL(dashboard.id)} />
            <Action.CreateQuicklink
              title="Add to Raycast Search"
              icon={icon}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              quicklink={{ name: dashboard.title || dashboard.id, link: url, icon: Icon.AppWindow }}
            />
          </>
        )}
      </ActionPanel.Section>
      <CommonActions refresh={refresh} />
    </ActionPanel>
  );
}

export default function SearchDashboards() {
  const { apiUrl, apiToken } = getPreferenceValues<Preferences>();
  const abortable = useRef<AbortController | null>(null);
  const state = usePromise(
    (url: string, token: string) => fetchDashboards({ apiUrl: url, apiToken: token }, abortable.current?.signal),
    [apiUrl, apiToken],
    { abortable, onError: () => undefined },
  );
  const { data: dashboards = [], error, isLoading, revalidate } = state;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search dashboards by title or ID…">
      <List.EmptyView
        icon={!isLoading && error ? Icon.ExclamationMark : Icon.AppWindowGrid3x3}
        {...getEmptyView(state)}
        actions={
          <ActionPanel>
            <CommonActions refresh={revalidate} />
          </ActionPanel>
        }
      />
      {dashboards.map((dashboard) => {
        const source = dashboardIconSource(dashboard.icon);
        const icon: Image.ImageLike = source ? { source, fallback: Icon.AppWindow } : Icon.AppWindow;
        return (
          <List.Item
            key={dashboard.id}
            id={dashboard.id}
            title={dashboard.title || dashboard.id}
            subtitle={dashboard.title ? dashboard.id : undefined}
            icon={icon}
            keywords={[dashboard.id]}
            accessories={dashboard.enabled ? [] : [{ tag: "Disabled", tooltip: dashboard.disabled_reason }]}
            actions={<DashboardActions dashboard={dashboard} icon={icon} refresh={revalidate} />}
          />
        );
      })}
    </List>
  );
}
