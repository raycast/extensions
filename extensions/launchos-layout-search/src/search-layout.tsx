import {
  Action,
  ActionPanel,
  Color,
  Keyboard,
  Icon,
  List,
  getPreferenceValues,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  DEFAULT_DATABASE,
  LayoutApp,
  readLayout,
  verifyAppPath,
} from "./layout";

async function openApp(app: LayoutApp) {
  try {
    await verifyAppPath(app.path);
    await open(app.path);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open App",
      message:
        error instanceof Error ? error.message : "Try refreshing the layout.",
    });
  }
}

export default function Command() {
  const preferences = getPreferenceValues<{
    databasePath?: string;
    includeHidden?: boolean;
  }>();
  const database = preferences.databasePath?.trim() || DEFAULT_DATABASE;
  const { data, isLoading, error, revalidate } = usePromise(
    readLayout,
    [database, preferences.includeHidden === true],
    { onError: () => undefined },
  );
  const [group, setGroup] = useState("all");
  const apps = data?.apps || [];
  const groups = [...new Set(apps.map((app) => app.group))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const refresh = (
    <Action
      title="Refresh Layout"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );
  return (
    <List
      isLoading={isLoading}
      navigationTitle="LaunchOS Layout"
      searchBarPlaceholder="Search names and custom aliases…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Folder or Page"
          value={group}
          onChange={setGroup}
        >
          <List.Dropdown.Item title="All Folders and Pages" value="all" />
          {groups.map((value) => (
            <List.Dropdown.Item key={value} title={value} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="Could Not Read LaunchOS Layout"
          icon={Icon.Warning}
          description={
            error instanceof Error
              ? error.message
              : "Check the database path in preferences."
          }
          actions={<ActionPanel>{refresh}</ActionPanel>}
        />
      ) : (
        apps
          .filter((app) => group === "all" || app.group === group)
          .map((app) => (
            <List.Item
              key={app.id}
              title={app.name}
              subtitle={
                app.name !== app.originalName ? app.originalName : undefined
              }
              icon={{ fileIcon: app.path }}
              keywords={[app.originalName, app.group, app.bundleId]}
              accessories={[
                { tag: app.group },
                ...(app.hidden
                  ? [{ tag: { value: "Hidden", color: Color.Orange } }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open App"
                    icon={Icon.AppWindow}
                    onAction={() => openApp(app)}
                  />
                  <Action.ShowInFinder path={app.path} />
                  <Action.CopyToClipboard
                    title="Copy App Path"
                    content={app.path}
                  />
                  {refresh}
                  <Action.OpenInBrowser
                    title="LaunchOS Documentation"
                    url="https://launchosapp.com/features/"
                  />
                </ActionPanel>
              }
            />
          ))
      )}
      {!error && !isLoading ? (
        <List.EmptyView
          title={apps.length ? "No Matching Apps" : "No Apps in This Layout"}
          description={
            apps.length
              ? "Clear the search or choose another folder or page. You can refresh to load layout changes."
              : "Open LaunchOS to populate its layout, then refresh."
          }
          actions={<ActionPanel>{refresh}</ActionPanel>}
        />
      ) : null}
      {data?.skipped || data?.truncated ? (
        <List.Section title="Layout Coverage">
          <List.Item
            icon={Icon.Info}
            title="Some Layout Entries Were Omitted"
            subtitle={
              data.truncated
                ? "More than 5,000 app entries; results are limited"
                : `${data.skipped} entries had missing or unsupported app locations`
            }
            actions={<ActionPanel>{refresh}</ActionPanel>}
          />
        </List.Section>
      ) : null}
    </List>
  );
}
