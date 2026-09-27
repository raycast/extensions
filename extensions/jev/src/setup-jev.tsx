import {
  Action,
  ActionPanel,
  Icon,
  List,
  LaunchType,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import ManageDestinations, { DestinationForm } from "./manage-destinations";
import BookmarkSources from "./bookmark-sources";
import { ErrorView, askJev, report, useData } from "./lib/ui";
import { saveDestination } from "./lib/destinations";
export default function Command() {
  const { data, loading, error, update } = useData();
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState("");
  if (error) return <ErrorView error={error} />;
  const keyPresent = Boolean(getPreferenceValues<Preferences>().apiKey?.trim());
  const folders = data.destinations.filter((d) => d.kind === "folder");
  const open = (name: string) => launchCommand({ name, type: LaunchType.UserInitiated });
  async function checkConnection() {
    if (checking) return;
    setChecking(true);
    try {
      await askJev("Setup test: a sample receipt for a USB cable.", {
        receipt: { type: "noul", instructions: "Does this sample describe a purchase receipt?" },
      });
      setConnection("Connected · test request succeeded");
      await showToast({ style: Toast.Style.Success, title: "Jev is connected" });
    } catch (e) {
      setConnection("Connection needs attention · open preferences or retry");
      await report(e);
    } finally {
      setChecking(false);
    }
  }
  return (
    <List isLoading={loading || checking} searchBarPlaceholder="Set up Jev…">
      <List.Section title="Get Ready" subtitle="Manual filing and bookmark search work without an API key">
        <List.Item
          title="1. Connect TypeSafe"
          subtitle={
            connection || (keyPresent ? "Key saved · test the connection" : "Add your API key in Jev preferences")
          }
          icon={Icon.Key}
          actions={
            <ActionPanel>
              {keyPresent ? (
                <Action title="Test Connection" onAction={checkConnection} />
              ) : (
                <Action title="Enter API Key" onAction={openExtensionPreferences} />
              )}
              <Action title="Open Jev Preferences" onAction={openExtensionPreferences} />
              {!keyPresent && <Action title="Test Connection" onAction={checkConnection} />}
            </ActionPanel>
          }
        />
        <List.Item
          title="2. Choose Document Folders"
          subtitle={
            folders.length
              ? `${folders.length} configured · add another or edit your destinations`
              : "Choose an existing folder and describe what belongs there"
          }
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Document Folder"
                target={<DestinationForm kind="folder" onSave={(d) => update((s) => saveDestination(s, d))} />}
              />
              <Action.Push title="Manage Destinations" target={<ManageDestinations />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="3. Choose Bookmark Sources"
          subtitle={`${data.bookmarkSources.length} profiles selected · choose browsers and folders`}
          icon={Icon.Bookmark}
          actions={
            <ActionPanel>
              <Action.Push title="Choose Bookmark Sources" target={<BookmarkSources />} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Start Using Jev">
        {[
          ["Run a Text Preset", "run-preset", "Select or paste text, review it, then run a saved check"],
          ["File Documents", "file-documents", "Preview a suggestion, review the destination, then confirm the move"],
          ["Search Links", "search-links", "Find by words or explicitly search by meaning"],
        ].map(([title, name, subtitle]) => (
          <List.Item
            key={name!}
            title={title!}
            subtitle={subtitle!}
            icon={Icon.Play}
            actions={
              <ActionPanel>
                <Action title="Open Command" onAction={() => open(name!)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Recovery">
        <List.Item
          title="Backup and Restore"
          subtitle="Export your data or recover an earlier version"
          icon={Icon.HardDrive}
          actions={
            <ActionPanel>
              <Action title="Open Backup and Restore" onAction={() => open("backup-restore")} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
