import { readFileSync } from "node:fs";
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
  openExtensionPreferences,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { join } from "node:path";
import { libraryDirectoryPath, useLibrary, preferences } from "./state";
import { libraryCSVFiles, Library } from "../core/library";
import { parseCSV } from "../core/csv";
export async function reportError(e: unknown) {
  await showToast({
    style: Toast.Style.Failure,
    title: "Check input",
    message: e instanceof Error ? e.message : String(e),
  });
}
export function LibraryError({ message, reload }: { message: string; reload: () => void }) {
  return (
    <Detail
      markdown={`# Library needs attention\n\n${message}\n\nCSV folder: ${libraryDirectoryPath()}\n\nCorrect the CSV and reload. Blank values mean unavailable; units are documented in the guide.`}
      actions={
        <ActionPanel>
          <Action.Open title="Open Library Folder" target={libraryDirectoryPath()} />
          <Action title="Open CSV Folder Settings" onAction={openExtensionPreferences} />
          <Action title="Reload" icon={Icon.ArrowClockwise} onAction={reload} />
        </ActionPanel>
      }
    />
  );
}
function availableCSVFiles() {
  try {
    return libraryCSVFiles(libraryDirectoryPath());
  } catch {
    return [];
  }
}
export function CSVActions({ reload, showSources = true }: { reload: () => void; showSources?: boolean }) {
  const { push } = useNavigation();
  return (
    <ActionPanel.Section title="Editable CSV Library">
      {showSources && (
        <Action title="Show CSV Files and Path" onAction={() => push(<CSVFilesView onReload={reload} />)} />
      )}
      <Action.Open title="Open Materials CSV" target={join(libraryDirectoryPath(), "materials.csv")} />
      <Action.Open title="Open Sections CSV" target={join(libraryDirectoryPath(), "sections.csv")} />
      {availableCSVFiles()
        .filter((n) => /^(?:materials|sections)-.+\.csv$/i.test(n))
        .map((n) => (
          <Action.Open key={n} title={"Open " + n} target={join(libraryDirectoryPath(), n)} />
        ))}
      {showSources && <Action.Open title="Open Library Folder" target={libraryDirectoryPath()} />}
      <Action
        title="Reload CSV Library"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={reload}
      />
    </ActionPanel.Section>
  );
}

/** Shows the resolved runtime path, not an empty optional preference. */
export function csvSourcesMarkdown(library: Library) {
  const directory = library.directory;
  const files = libraryCSVFiles(directory).map((name) => ({
    name,
    rows: parseCSV(readFileSync(join(directory, name), "utf8")).length,
  }));
  return `# CSV files\n\n**Active folder**\n\n${directory}\n\n${preferences().libraryDirectory?.trim() ? "Custom folder selected in extension settings." : "Automatic personal folder. The optional custom-folder setting is blank."}\n\n**Loaded:** ${library.materials.length} unique materials and ${library.sections.length} unique sections.\n\n| File | CSV records |\n|---|---:|\n${files.map((f) => "| " + f.name + " | " + f.rows + " |").join("\n")}\n\nMaterial and section presets are read from these CSV files. Custom input values and saved calculation snapshots remain explicit overrides. Save your edits, then use **Reload CSV Library** (Ctrl+R), or reopen the calculator.\n\nOne folder holds multiple catalogues: materials.csv, sections.csv, materials-*.csv and sections-*.csv. Base-file IDs take precedence over additional catalogues. Section families come from the CSV family column.\n\nThe installation includes the bundled CSVs and creates editable personal copies on first use. Existing files are preserved. Use **Copy CSV Folder Path** or **Open Library Folder** below; choose **Open CSV Folder Settings** to select a different folder.`;
}
export function CSVFilesView({ onReload }: { onReload?: () => void } = {}) {
  const { library, error, reload } = useLibrary();
  const refresh = () => {
    reload();
    onReload?.();
  };
  let markdown = error
    ? "# CSV loading failed\n\n" + error + "\n\nFolder: " + libraryDirectoryPath()
    : "Loading CSV files…";
  try {
    if (library && !error) markdown = csvSourcesMarkdown(library);
  } catch (e) {
    markdown = "# CSV loading failed\n\n" + String(e) + "\n\nFolder: " + libraryDirectoryPath();
  }
  return (
    <Detail
      navigationTitle="CSV Files"
      isLoading={!library && !error}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Open title="Open Library Folder" target={libraryDirectoryPath()} />
          <Action.CopyToClipboard title="Copy CSV Folder Path" content={libraryDirectoryPath()} />
          <Action title="Open CSV Folder Settings" onAction={openExtensionPreferences} />
          <CSVActions reload={refresh} showSources={false} />
        </ActionPanel>
      }
    />
  );
}
