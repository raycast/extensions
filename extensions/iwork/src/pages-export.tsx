import { showHUD, ActionPanel, List, Action, popToRoot, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkPagesInstalled, resolveExportPath } from "./index";

interface ExportArguments {
  filename: string;
}

interface Preferences {
  exportDir: string;
}

const preferences = getPreferenceValues<Preferences>();

export default function Main(props: { arguments: ExportArguments }) {
  const { filename } = props.arguments;
  const filepath = resolveExportPath(preferences.exportDir, filename);

  // Check for Pages app
  Promise.resolve(checkPagesInstalled()).then((installed) => {
    if (!installed) {
      popToRoot();
    }
  });

  // Check whether there is an active document
  Promise.resolve(
    runAppleScript(`try
    tell application "Pages" to get document 1
  end try`)
  ).then((document) => {
    if (!document) {
      showHUD(`No active document to export!`);
      popToRoot();
    }
  });

  return (
    <List searchBarPlaceholder="Search formats...">
      <List.Item
        title="PDF"
        actions={
          <ActionPanel>
            <Action title="PDF" onAction={() => exportPDF(filepath)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="Word"
        actions={
          <ActionPanel>
            <Action title="Microsoft Word" onAction={() => exportWord(filepath)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="Formatted Text"
        actions={
          <ActionPanel>
            <Action title="Formatted Text" onAction={() => exportFormattedText(filepath)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="Unformatted Text"
        actions={
          <ActionPanel>
            <Action title="Unformatted Text" onAction={() => exportUnformattedText(filepath)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="Pages 09"
        actions={
          <ActionPanel>
            <Action title="Pages 09" onAction={() => exportPages09(filepath)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="EPUB"
        actions={
          <ActionPanel>
            <Action title="EPUB" onAction={() => exportEPUB(filepath)} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function exportPDF(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".pdf")) {
    filepath = filepath + ".pdf";
  }

  showHUD(`Exporting document as PDF...`);
  runAppleScript(`tell application "Pages"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as PDF
    end tell`);
  popToRoot();
}

function exportWord(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".docx")) {
    filepath = filepath + ".docx";
  }

  showHUD(`Exporting document as Microsoft Word...`);
  runAppleScript(`tell application "Pages"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as Microsoft Word
    end tell`);
  popToRoot();
}

function exportFormattedText(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".rtf")) {
    filepath = filepath + ".rtf";
  }

  showHUD(`Exporting document as formatted text...`);
  runAppleScript(`tell application "Pages"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as formatted text
    end tell`);
  popToRoot();
}

function exportUnformattedText(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".txt")) {
    filepath = filepath + ".txt";
  }

  showHUD(`Exporting document as unformatted text...`);
  runAppleScript(`tell application "Pages"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as unformatted text
    end tell`);
  popToRoot();
}

function exportPages09(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".pages")) {
    filepath = filepath + ".pages";
  }

  showHUD(`Exporting document as Pages 09...`);
  runAppleScript(`tell application "Pages"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as Pages 09
    end tell`);
  popToRoot();
}

function exportEPUB(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".EPUB")) {
    filepath = filepath + ".EPUB";
  }

  showHUD(`Exporting slideshow as EPUB...`);
  runAppleScript(`tell application "Pages"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as EPUB
    end tell`);
  popToRoot();
}
