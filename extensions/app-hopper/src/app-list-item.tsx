import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { AppWindowsView, AXWindowsView } from "./app-windows";
import { getAppRow, type AppRowData, type AppRowTarget } from "./app-row";
import { BrowserWindowsView } from "./browser-windows";
import { FirefoxIntegrationAction } from "./firefox-integration";
import { remainingSearch } from "./helpers/search";
import { RefreshWindowsAction, type WindowActions } from "./window-actions";
import type { AppGroup } from "./windows";

interface PrimaryActionProps {
  app: AppGroup;
  target: AppRowTarget;
  actions: WindowActions;
  searchText: string;
}

function AppPrimaryAction({ app, target, actions, searchText }: PrimaryActionProps) {
  switch (target.kind) {
    case "application":
      return <Action title={target.title} onAction={() => actions.activateApp(app)} />;
    case "browser":
      return (
        <Action.Push
          title="Show Browser Tabs and Windows"
          target={
            <BrowserWindowsView
              browser={target.snapshot.browser}
              initialSnapshot={target.snapshot}
              initialSearchText={searchText}
            />
          }
        />
      );
    case "ax-window":
      return <Action title="Focus Window" onAction={() => actions.focusAXWindow(target.window)} />;
    case "ax-windows":
      return (
        <Action.Push
          title="Show Windows"
          target={
            <AXWindowsView
              app={app}
              windows={target.windows}
              onFocus={actions.focusAXWindow}
              onRefresh={actions.refresh}
              initialSearchText={searchText}
            />
          }
        />
      );
    case "windows":
      return (
        <Action.Push
          title="Show Windows"
          target={
            <AppWindowsView
              app={app}
              onFocus={actions.focusWindow}
              onRefresh={actions.refresh}
              initialSearchText={searchText}
            />
          }
        />
      );
  }
}

export function AppListItem({
  app,
  data,
  actions,
  searchText,
  actionsEnabled,
}: {
  app: AppGroup;
  data: AppRowData;
  actions: WindowActions;
  searchText: string;
  actionsEnabled: boolean;
}) {
  const row = getAppRow(app, data);
  const carriedSearch = remainingSearch(searchText, [app.name, ...app.windows.map((window) => window.app)]);
  return (
    <List.Item
      id={app.id}
      icon={app.bundlePath ? { fileIcon: app.bundlePath } : Icon.AppWindow}
      title={app.name}
      subtitle={row.subtitle}
      accessories={row.space ? [{ text: row.space }] : undefined}
      actions={
        actionsEnabled ? (
          <ActionPanel>
            <AppPrimaryAction app={app} target={row.target} actions={actions} searchText={carriedSearch} />
            <RefreshWindowsAction onRefresh={actions.refresh} />
            {row.browser?.engine === "firefox" && (
              <FirefoxIntegrationAction browserId={row.browser.id === "zen" ? "zen" : "firefox"} />
            )}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
