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
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getSessions, launchPutty, PuttySession, resolvePuttyExe, sessionSubtitle } from "./putty";

/** The PuTTY logo, used wherever we represent PuTTY itself. */
const PuttyIcon = { source: "putty.svg" };

export default function Command() {
  const { puttyExePath, showOpenEntry, startMaximized } = getPreferenceValues<Preferences.SearchSessions>();
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useCachedPromise(
    async (configured?: string) => {
      const exePath = await resolvePuttyExe(configured);
      if (!exePath) {
        return { exePath: undefined, sessions: [] as PuttySession[] };
      }
      try {
        const sessions = await getSessions();
        return { exePath, sessions };
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not read PuTTY sessions",
          message: error instanceof Error ? error.message : String(error),
        });
        return { exePath, sessions: [] as PuttySession[] };
      }
    },
    [puttyExePath],
  );

  const exePath = data?.exePath;
  const allSessions = data?.sessions ?? [];

  // Faithful to the original: filter session identifiers by a case-insensitive
  // substring of the query rather than fuzzy matching.
  const query = searchText.trim();
  const sessions = query
    ? allSessions.filter((s) => s.identifier.toLowerCase().includes(query.toLowerCase()))
    : allSessions;
  const hasExactSession = query
    ? allSessions.some((session) => session.identifier.toLowerCase() === query.toLowerCase())
    : false;

  async function launch(target: { session?: PuttySession; directHost?: string }) {
    if (!exePath) return;
    try {
      await launchPutty(exePath, target, startMaximized);
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to launch PuTTY",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // PuTTY could not be located anywhere and no path was configured.
  if (!isLoading && !exePath) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="PuTTY executable not found"
          description="PuTTY wasn't found on your PATH, via Scoop, in the registry, or in the Start Menu. Set the executable path in the extension preferences."
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
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search PuTTY sessions or type a host to SSH into..."
    >
      {showOpenEntry && exePath && (
        <List.Item
          icon={PuttyIcon}
          title="Open PuTTY"
          subtitle="Start without a session"
          actions={
            <ActionPanel>
              <Action title="Open PuTTY" icon={PuttyIcon} onAction={() => launch({})} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}

      <List.Section title="Sessions" subtitle={sessions.length ? String(sessions.length) : undefined}>
        {sessions.map((session) => (
          <List.Item
            key={session.identifier}
            icon={PuttyIcon}
            title={session.identifier}
            subtitle={sessionSubtitle(session) || undefined}
            accessories={session.protocol ? [{ tag: session.protocol }] : undefined}
            actions={
              <ActionPanel>
                <Action title="Load Session" icon={PuttyIcon} onAction={() => launch({ session })} />
                <Action.CopyToClipboard title="Copy Session Name" content={session.identifier} />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {/* Mirrors the original plugin: when you type a host that isn't a saved
          session, offer to SSH into it directly. */}
      {query && exePath && !hasExactSession && (
        <List.Section title="Direct Connection">
          <List.Item
            icon={Icon.Globe}
            title={`Connect to "${query}" via SSH`}
            subtitle={`ssh://${query}`}
            actions={
              <ActionPanel>
                <Action title="Connect Via SSH" icon={PuttyIcon} onAction={() => launch({ directHost: query })} />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={isLoading ? "Loading sessions..." : "No PuTTY sessions found"}
        description={
          query
            ? `No saved session matches "${query}". Use the Direct Connection entry to SSH straight into it.`
            : "No sessions were found in the registry (HKCU\\Software\\SimonTatham\\PuTTY\\Sessions)."
        }
      />
    </List>
  );
}
