import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { dirname } from "path";
import ManageSearchFolders from "./manage";
import { getPreferences } from "./preferences";
import { loadScopes, prettyPath, Scope } from "./scopes";
import { containingDirectory, Entry, walkScopes } from "./walk";

const ALL_SCOPES = "__all__";

type LoadedData = {
  scopes: Scope[];
  entries: Entry[];
  missingScopes: string[];
  truncated: boolean;
};

const EMPTY: LoadedData = {
  scopes: [],
  entries: [],
  missingScopes: [],
  truncated: false,
};

export default function ScopedSearch() {
  const prefs = useMemo(getPreferences, []);
  const [selectedScope, setSelectedScope] = useState<string>(ALL_SCOPES);

  const { data, isLoading, revalidate } =
    usePromise(async (): Promise<LoadedData> => {
      const scopes = await loadScopes();
      const result = await walkScopes(scopes, prefs);
      return { scopes, ...result };
    }, []);

  const { scopes, entries, missingScopes, truncated } = data ?? EMPTY;

  useEffect(() => {
    if (missingScopes.length > 0) {
      showToast({
        style: Toast.Style.Failure,
        title:
          missingScopes.length === 1
            ? "A search folder is missing"
            : "Some search folders are missing",
        message: missingScopes.map(prettyPath).join(", "),
      });
    } else if (truncated) {
      showToast({
        style: Toast.Style.Failure,
        title: "Result limit reached",
        message: `Stopped at ${prefs.maxResults} items. Lower the search depth or raise the limit in preferences.`,
      });
    }
  }, [missingScopes.join("|"), truncated]);

  const visibleEntries = useMemo(
    () =>
      selectedScope === ALL_SCOPES
        ? entries
        : entries.filter((entry) => entry.scopePath === selectedScope),
    [entries, selectedScope],
  );

  const manageAction = (
    <Action.Push
      title="Manage Search Folders"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      target={<ManageSearchFolders />}
      onPop={revalidate}
    />
  );

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );

  const activeScopes = scopes.filter((scope) => scope.enabled);
  const depthLabel =
    prefs.maxDepth === 0
      ? "all levels"
      : `${prefs.maxDepth} level${prefs.maxDepth > 1 ? "s" : ""}`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        activeScopes.length === 0
          ? "No search folders configured yet"
          : `Search ${activeScopes.length} folder${activeScopes.length > 1 ? "s" : ""} (${depthLabel} deep)...`
      }
      searchBarAccessory={
        scopes.length > 1 ? (
          <List.Dropdown
            tooltip="Limit to one folder"
            value={selectedScope}
            onChange={setSelectedScope}
          >
            <List.Dropdown.Item
              title="All search folders"
              value={ALL_SCOPES}
              icon={Icon.Folder}
            />
            <List.Dropdown.Section>
              {scopes.map((scope) => (
                <List.Dropdown.Item
                  key={scope.path}
                  title={prettyPath(scope.path)}
                  value={scope.path}
                  icon={{ fileIcon: scope.path }}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={scopes.length === 0 ? Icon.Folder : Icon.MagnifyingGlass}
        title={
          scopes.length === 0 ? "No search folders yet" : "Nothing matched"
        }
        description={
          scopes.length === 0
            ? "Add the folders you want to search. Everything outside them is ignored."
            : "Try a shorter query, or raise the search depth in this command's preferences."
        }
        actions={
          <ActionPanel>
            {manageAction}
            {refreshAction}
          </ActionPanel>
        }
      />

      {visibleEntries.map((entry) => (
        <List.Item
          key={entry.path}
          icon={{ fileIcon: entry.path }}
          title={entry.name}
          subtitle={
            entry.relativePath === entry.name
              ? undefined
              : dirname(entry.relativePath)
          }
          keywords={entry.relativePath.split("/").filter(Boolean)}
          accessories={[
            { tag: { value: entry.scopeName, color: Color.SecondaryText } },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Open
                  title="Open in Finder"
                  icon={Icon.Finder}
                  target={entry.path}
                  application="Finder"
                />
                <Action.Open
                  title="Open in Terminal"
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  target={containingDirectory(entry)}
                  application={prefs.terminalApp ?? "Terminal"}
                />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={entry.path}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                {prefs.editorApp ? (
                  <Action.Open
                    title={`Open in ${prefs.editorApp.name}`}
                    icon={Icon.Code}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={entry.path}
                    application={prefs.editorApp}
                  />
                ) : null}
                <Action.ShowInFinder
                  path={entry.path}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                />
                <Action.OpenWith
                  path={entry.path}
                  shortcut={Keyboard.Shortcut.Common.OpenWith}
                />
                <Action.ToggleQuickLook
                  shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={entry.name}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                {manageAction}
                {refreshAction}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
