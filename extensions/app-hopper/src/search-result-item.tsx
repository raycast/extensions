import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { AppListItem } from "./app-list-item";
import type { AppRowData } from "./app-row";
import { getAppWindowEvidence } from "./app-window-evidence";
import { AppWindowsView, AXWindowsView } from "./app-windows";
import { BrowserTabsView, BrowserWindowsView, switchBrowserTab } from "./browser-windows";
import type { BrowserWindow } from "./browsers/types";
import { getBrowserTabProps } from "./helpers/browser-tab-presentation";
import { remainingSearch } from "./helpers/search";
import type { StableResult } from "./helpers/use-stable-results";
import { getWindowAccessories } from "./helpers/window-presentation";
import type { SearchResult } from "./search-results";
import { RefreshWindowsAction, type WindowActions } from "./window-actions";

type ContentResult = Exclude<SearchResult, { kind: "app" }>;
interface ResultProps {
  row: StableResult<SearchResult>;
  data: AppRowData;
  actions: WindowActions;
  searchText: string;
  actionsEnabled: boolean;
}

function unavailableTitle(result: SearchResult): string {
  if (result.kind === "app") return result.app.name;
  if (result.kind === "tab") return result.tab.title;
  return result.window.title || "Untitled Window";
}

function UnavailableResultItem({ row: { item }, actions, actionsEnabled }: ResultProps) {
  let accessories: List.Item.Accessory[] | undefined;
  if (item.kind !== "app") {
    accessories = [{ text: item.kind === "tab" ? item.browser.appName : item.app.name }];
  }
  return (
    <List.Item
      id={item.id}
      title={unavailableTitle(item)}
      icon={item.app.bundlePath ? { fileIcon: item.app.bundlePath } : Icon.AppWindow}
      subtitle="No longer available"
      accessories={accessories}
      actions={
        actionsEnabled ? (
          <ActionPanel>
            <RefreshWindowsAction onRefresh={actions.refresh} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function ContentPrimaryAction({ result, actions }: { result: ContentResult; actions: WindowActions }) {
  if (result.kind === "tab")
    return (
      <Action
        icon={Icon.ArrowRight}
        title="Switch to Tab"
        onAction={() => switchBrowserTab(result.browser, result.window, result.tab)}
      />
    );
  if (result.kind === "ax-window")
    return <Action icon={Icon.AppWindow} title="Focus Window" onAction={() => actions.focusAXWindow(result.window)} />;
  return <Action icon={Icon.AppWindow} title="Focus Window" onAction={() => actions.focusWindow(result.window)} />;
}

function ContentNavigationActions({
  result,
  data,
  actions,
  searchText,
}: Omit<ResultProps, "row" | "actionsEnabled"> & { result: ContentResult }) {
  const { app } = result;
  const evidence = getAppWindowEvidence(app, data);
  const carriedSearch = remainingSearch(searchText, [app.name, ...app.windows.map((window) => window.app)]);
  const browser = result.kind === "ax-window" ? undefined : result.browser;
  if (browser) {
    let window: BrowserWindow | undefined;
    if (result.kind === "tab") window = result.window;
    if (result.kind === "window") window = result.browserWindow;
    return (
      <>
        {window && (
          <Action.Push
            icon={Icon.List}
            title="Show Tabs"
            target={
              <BrowserTabsView
                browser={browser}
                window={window}
                initialSearchText={remainingSearch(searchText, [app.name, window.title])}
              />
            }
          />
        )}
        <Action.Push
          icon={Icon.Globe}
          title="Show Browser Tabs and Windows"
          target={
            <BrowserWindowsView
              browser={browser}
              initialSnapshot={evidence.browser?.snapshot}
              initialSearchText={carriedSearch}
            />
          }
        />
      </>
    );
  }
  if (result.kind === "ax-window")
    return (
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Windows"
        target={
          <AXWindowsView
            app={app}
            windows={evidence.accessibility.windows}
            onFocus={actions.focusAXWindow}
            onRefresh={actions.refresh}
            initialSearchText={carriedSearch}
          />
        }
      />
    );
  return (
    <Action.Push
      icon={Icon.AppWindowList}
      title="Show Windows"
      target={
        <AppWindowsView
          app={app}
          onFocus={actions.focusWindow}
          onRefresh={actions.refresh}
          initialSearchText={carriedSearch}
        />
      }
    />
  );
}

function contentPresentation(result: ContentResult) {
  if (result.kind === "tab") {
    const props = getBrowserTabProps(result.browser, result.window, result.tab);
    return {
      ...props,
      accessories: [
        { text: result.browser.appName, tooltip: `Tab in ${result.browser.appName}` },
        ...(props.accessories ?? []),
      ],
    };
  }
  return {
    icon: result.app.bundlePath ? { fileIcon: result.app.bundlePath } : Icon.AppWindow,
    title: result.window.title || "Untitled Window",
    subtitle: result.app.name,
    accessories: getWindowAccessories(result.window),
  };
}

export function SearchResultItem(props: ResultProps) {
  const { row, data, actions, searchText, actionsEnabled } = props;
  if (row.unavailable) return <UnavailableResultItem {...props} />;
  const result = row.item;
  if (result.kind === "app")
    return (
      <AppListItem
        app={result.app}
        data={data}
        actions={actions}
        searchText={searchText}
        actionsEnabled={actionsEnabled}
      />
    );
  return (
    <List.Item
      id={result.id}
      {...contentPresentation(result)}
      actions={
        actionsEnabled ? (
          <ActionPanel>
            <ContentPrimaryAction result={result} actions={actions} />
            <ContentNavigationActions result={result} data={data} actions={actions} searchText={searchText} />
            <RefreshWindowsAction onRefresh={actions.refresh} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
