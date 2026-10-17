import {
  Action,
  ActionPanel,
  Icon,
  List,
  closeMainWindow,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import path from "path";
import { getAllSessions, HeidiSession, launchHeidi, resolveHeidiExe } from "./heidi";

const DATABASE_ICONS = {
  mysql: "database-icons/mysql.svg",
  mssql: "database-icons/mssql.svg",
  postgresql: "database-icons/postgresql.svg",
  sqlite: "database-icons/sqlite.svg",
  proxysql: "database-icons/proxysql.svg",
  interbase: { source: "database-icons/interbase.svg", tintColor: "#E6242A" },
  firebird: "database-icons/firebird.svg",
} as const;

const IS_MAC = process.platform === "darwin";

export default function Command() {
  const { heidiExePath, portableMode, showOpenEntry } = getPreferenceValues<Preferences.SearchSessions>();

  const { data, isLoading } = usePromise(
    async (configured: string | undefined, portable: boolean) => {
      const exePath = await resolveHeidiExe(configured);
      if (!exePath) {
        return { exePath: undefined, sessions: [] as HeidiSession[] };
      }
      try {
        const sessions = await getAllSessions(exePath, portable);
        return { exePath, sessions };
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not read HeidiSQL sessions",
          message: error instanceof Error ? error.message : String(error),
        });
        return { exePath, sessions: [] as HeidiSession[] };
      }
    },
    [heidiExePath, portableMode],
  );

  const exePath = data?.exePath;
  const sessions = data?.sessions ?? [];

  async function open(session?: HeidiSession) {
    if (!exePath) return;
    try {
      await launchHeidi(exePath, session);
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to launch HeidiSQL",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // HeidiSQL could not be located anywhere and no path was configured.
  if (!isLoading && !exePath) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="HeidiSQL not found"
          description={
            IS_MAC
              ? "HeidiSQL wasn't found in /Applications or ~/Applications. Set the path to heidisql.app in the extension preferences."
              : "HeidiSQL wasn't found on your PATH, via Scoop, or in the default install location. Set the executable path in the extension preferences."
          }
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search HeidiSQL sessions...">
      {showOpenEntry && exePath && (
        <List.Item
          icon={Icon.Plus}
          title="Open HeidiSQL"
          subtitle="Start without a session"
          actions={
            <ActionPanel>
              <Action title="Open HeidiSQL" icon={Icon.AppWindow} onAction={() => open()} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}

      <List.Section title="Sessions" subtitle={sessions.length ? String(sessions.length) : undefined}>
        {sessions.map((session) => {
          // Display the leaf name; keep the folder path visible as a subtitle.
          const name = path.win32.basename(session.identifier);
          const folder = path.win32.dirname(session.identifier);
          return (
            <List.Item
              key={session.identifier}
              icon={session.databaseType ? DATABASE_ICONS[session.databaseType] : Icon.Coin}
              title={name}
              subtitle={folder && folder !== "." ? folder : undefined}
              keywords={session.identifier.split(/[\\/]/).filter(Boolean)}
              actions={
                <ActionPanel>
                  <Action title="Open Session" icon={Icon.AppWindow} onAction={() => open(session)} />
                  <Action.CopyToClipboard title="Copy Session Name" content={session.identifier} />
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={isLoading ? "Loading sessions..." : "No HeidiSQL sessions found"}
        description={
          IS_MAC
            ? "No sessions were found in ~/.config/heidisql/settings.json."
            : portableMode
              ? "No sessions were found in portable_settings.txt next to the executable."
              : "No sessions were found in the registry (HKCU\\Software\\HeidiSQL\\Servers)."
        }
      />
    </List>
  );
}
