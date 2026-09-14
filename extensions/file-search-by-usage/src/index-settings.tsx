import { useCallback, useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  BUILT_IN_PATTERNS,
  DEFAULT_SETTINGS,
  IndexSettings,
  addPattern,
  addScope,
  describeSettings,
  removePattern,
  removeScope,
} from "./lib/index-settings";
import {
  loadIndexSettings,
  saveIndexSettings,
} from "./lib/index-settings-store";
import { IndexStats } from "./lib/index-db";
import { readStats } from "./lib/index-reader";
import { searchIndexPath } from "./lib/index-rebuild";
import { googleDriveIndexRoots } from "./lib/index-build";
import { displayPath } from "./lib/read-dir";
import { formatDuration, formatIndexBytes } from "./lib/format";

/**
 * Search Index Settings.
 *
 * Raycast extension preferences are static and single-valued, so a list the
 * user can add to and remove from cannot live in the preferences pane. This
 * command is the editor instead: a List with sections, the folder picker from a
 * Form.FilePicker action, and the index stats.
 *
 * Nothing here rebuilds the index. Changing the scope and paying for a scan are
 * separate decisions, so the screen says an edit applies at the next rebuild.
 */

/**
 * Folder picker.
 *
 * `Form.FilePicker` is the only folder chooser in the API and it is a form
 * item, so adding a scope pushes a one-field form rather than opening a panel
 * from the list directly.
 */
function AddScopeForm({ onAdd }: { onAdd: (folders: string[]) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Search Scope"
            icon={Icon.Plus}
            onSubmit={(values: { folders: string[] }) => {
              onAdd(values.folders ?? []);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folders"
        title="Folder"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
        info="Indexed the next time you run Rebuild Search Index."
      />
    </Form>
  );
}

export default function Command() {
  const [settings, setSettings] = useState<IndexSettings>();
  const [stats, setStats] = useState<IndexStats>();
  const [driveRoots, setDriveRoots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const reload = useCallback(async () => {
    const [loaded, roots] = await Promise.all([
      loadIndexSettings(),
      googleDriveIndexRoots(),
    ]);
    setSettings(loaded);
    setDriveRoots(roots);
    setStats(readStats(searchIndexPath()));
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const commit = useCallback(async (next: IndexSettings) => {
    // Show the change immediately, then keep it only if the write succeeds.
    setSettings(next);
    const outcome = await saveIndexSettings(next);
    if (outcome === "saved") return true;
    await showToast({
      style: Toast.Style.Failure,
      title: "Settings could not be saved",
      message:
        outcome === "reset"
          ? "Extension data was reset while this screen was open."
          : "Wait for any indexing or data deletion to finish, then retry. Your other data is untouched.",
    });
    setSettings(await loadIndexSettings());
    return false;
  }, []);

  const onAddScope = useCallback(
    async (folders: string[]) => {
      if (!settings) return;
      let next = settings;
      const rejected: string[] = [];
      for (const folder of folders) {
        const result = addScope(next, folder);
        if (result.kind === "added") next = result.settings;
        else if (result.kind === "invalid") rejected.push(result.reason);
        else if (result.kind === "full")
          rejected.push(`At most ${result.max} folders`);
      }
      if (next !== settings) await commit(next);
      if (rejected.length > 0)
        await showToast({
          style: Toast.Style.Failure,
          title: "Some folders were not added",
          message: [...new Set(rejected)].join(". "),
        });
    },
    [settings, commit],
  );

  const onAddPattern = useCallback(async () => {
    if (!settings) return;
    const result = addPattern(settings, filter);
    if (result.kind === "added") {
      if (await commit(result.settings)) setFilter("");
      return;
    }
    await showToast({
      style: Toast.Style.Failure,
      title:
        result.kind === "duplicate"
          ? "That pattern is already excluded"
          : result.kind === "full"
            ? `At most ${result.max} patterns`
            : result.reason,
      message:
        result.kind === "invalid"
          ? "Type the pattern in the search bar, then press Return."
          : undefined,
    });
  }, [settings, filter, commit]);

  const onReset = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Reset Search Index Settings?",
      message:
        "Search scopes, ignore patterns, and the toggles return to their defaults. " +
        "The index itself is left alone until the next rebuild.",
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    if (await commit({ ...DEFAULT_SETTINGS })) {
      await reload();
      await showToast({
        style: Toast.Style.Success,
        title: "Settings reset",
        message: "The next rebuild uses the defaults.",
      });
    }
  }, [commit, reload]);

  const toggle = useCallback(
    (key: "includeDrive" | "includeHidden" | "useIgnoreFiles") => async () => {
      if (!settings) return;
      await commit({ ...settings, [key]: !settings[key] });
    },
    [settings, commit],
  );

  /**
   * Return triggers the selected row's first action, and the search bar doubles
   * as the pattern input, so the first action must never be destructive.
   * Removal is on its own shortcut instead.
   */
  const addActions = settings && (
    <ActionPanel.Section title="Add">
      <Action
        title="Add Pattern from Search Bar"
        icon={Icon.Plus}
        onAction={onAddPattern}
      />
      <Action.Push
        title="Add Search Scope"
        icon={Icon.Folder}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<AddScopeForm onAdd={(folders) => void onAddScope(folders)} />}
      />
    </ActionPanel.Section>
  );

  const shared = settings && (
    <>
      <ActionPanel.Section title="Options">
        <Action
          title={
            settings.includeDrive
              ? "Stop Indexing Google Drive"
              : "Index Google Drive"
          }
          icon={Icon.HardDrive}
          onAction={toggle("includeDrive")}
        />
        <Action
          title={
            settings.includeHidden
              ? "Exclude Hidden Files"
              : "Include Hidden Files"
          }
          icon={Icon.EyeDisabled}
          onAction={toggle("includeHidden")}
        />
        <Action
          title={
            settings.useIgnoreFiles ? "Ignore Ignore Files" : "Use Ignore Files"
          }
          icon={Icon.Document}
          onAction={toggle("useIgnoreFiles")}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Reset to Defaults"
          icon={Icon.ArrowCounterClockwise}
          style={Action.Style.Destructive}
          onAction={onReset}
        />
      </ActionPanel.Section>
    </>
  );

  return (
    <List
      isLoading={loading}
      searchText={filter}
      onSearchTextChange={setFilter}
      searchBarPlaceholder="Type a pattern to ignore, then press Return…"
      // Ranking is the extension's job elsewhere; here the list is a form.
      filtering={false}
    >
      {settings === undefined ? null : (
        <>
          <List.Section
            title="Search Scopes"
            subtitle={describeSettings(settings)}
          >
            {settings.includeDrive &&
              (driveRoots.length === 0 ? (
                <List.Item
                  key="drive-missing"
                  icon={{ source: Icon.HardDrive, tintColor: Color.Orange }}
                  title="Google Drive"
                  subtitle="Detected automatically · none mounted right now"
                  actions={
                    <ActionPanel>
                      {addActions}
                      {shared}
                    </ActionPanel>
                  }
                />
              ) : (
                driveRoots.map((root) => (
                  <List.Item
                    key={root}
                    icon={Icon.HardDrive}
                    title={displayPath(root)}
                    subtitle="Detected automatically"
                    accessories={[{ text: "Google Drive" }]}
                    actions={
                      <ActionPanel>
                        {addActions}
                        {shared}
                      </ActionPanel>
                    }
                  />
                ))
              ))}
            {settings.scopes.map((scope) => (
              <List.Item
                key={scope}
                icon={Icon.Folder}
                title={displayPath(scope)}
                actions={
                  <ActionPanel>
                    {addActions}
                    <ActionPanel.Section>
                      <Action
                        title="Remove Search Scope"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() =>
                          void commit(removeScope(settings, scope))
                        }
                      />
                    </ActionPanel.Section>
                    {shared}
                  </ActionPanel>
                }
              />
            ))}
            {!settings.includeDrive && settings.scopes.length === 0 && (
              <List.Item
                key="nothing"
                icon={{ source: Icon.Warning, tintColor: Color.Red }}
                title="Nothing is set to be indexed"
                subtitle="Add a folder, or turn Google Drive back on"
                actions={
                  <ActionPanel>
                    {addActions}
                    {shared}
                  </ActionPanel>
                }
              />
            )}
          </List.Section>

          <List.Section
            title="Ignore Patterns"
            subtitle={
              settings.patterns.length > 0
                ? `${settings.patterns.length} added · ${BUILT_IN_PATTERNS.length} built in`
                : `${BUILT_IN_PATTERNS.length} built in`
            }
          >
            {settings.patterns.map((pattern) => (
              <List.Item
                key={`user:${pattern}`}
                icon={Icon.MinusCircle}
                title={pattern}
                actions={
                  <ActionPanel>
                    {addActions}
                    <ActionPanel.Section>
                      <Action
                        title="Remove Pattern"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() =>
                          void commit(removePattern(settings, pattern))
                        }
                      />
                    </ActionPanel.Section>
                    {shared}
                  </ActionPanel>
                }
              />
            ))}
            {BUILT_IN_PATTERNS.map((pattern) => (
              <List.Item
                key={`built-in:${pattern}`}
                icon={Icon.Lock}
                title={pattern}
                accessories={[{ text: "Always excluded" }]}
                actions={
                  <ActionPanel>
                    {addActions}
                    {shared}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          <List.Section title="Options">
            <List.Item
              icon={settings.includeHidden ? Icon.Eye : Icon.EyeDisabled}
              title="Include Hidden Files"
              subtitle="Index dot-prefixed files and folders"
              accessories={[{ text: settings.includeHidden ? "On" : "Off" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Hidden Files"
                    icon={Icon.Eye}
                    onAction={toggle("includeHidden")}
                  />
                  {shared}
                </ActionPanel>
              }
            />
            <List.Item
              icon={settings.useIgnoreFiles ? Icon.Eye : Icon.EyeDisabled}
              title="Use Ignore Files"
              subtitle="Respect .gitignore, .ignore and .fdignore while indexing"
              accessories={[{ text: settings.useIgnoreFiles ? "On" : "Off" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Ignore Files"
                    icon={Icon.Document}
                    onAction={toggle("useIgnoreFiles")}
                  />
                  {shared}
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section
            title="Index Stats"
            subtitle={stats ? undefined : "No index built yet"}
          >
            {stats !== undefined &&
              (
                [
                  ["Disk Usage", formatIndexBytes(stats.bytes)],
                  ["Total Entries", stats.entries.toLocaleString()],
                  ["Files", stats.files.toLocaleString()],
                  ["Directories", stats.directories.toLocaleString()],
                  ["Symlinks", stats.symlinks.toLocaleString()],
                  [
                    "Last Duration",
                    stats.lastDurationMs === undefined
                      ? "Not recorded"
                      : formatDuration(stats.lastDurationMs),
                  ],
                ] as const
              ).map(([label, value]) => (
                <List.Item
                  key={label}
                  icon={Icon.BarChart}
                  title={label}
                  accessories={[{ text: value }]}
                  actions={
                    <ActionPanel>
                      {addActions}
                      {shared}
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
