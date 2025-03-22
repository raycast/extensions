import { showHUD, ActionPanel, List, Action, popToRoot, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkKeynoteInstalled, resolveExportPath } from "./index";

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

  // Check for Keynote app
  Promise.resolve(checkKeynoteInstalled()).then((installed) => {
    if (!installed) {
      popToRoot();
    }
  });

  // Check whether there is an active document
  Promise.resolve(
    runAppleScript(`try
      tell application "Keynote" to get document 1
    end try`)
  ).then((document) => {
    if (!document) {
      showHUD(`No active slideshow to export!`);
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
        title="PowerPoint"
        actions={
          <ActionPanel>
            <Action title="Microsoft PowerPoint" onAction={() => exportPowerPoint(filepath)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="HTML"
        actions={
          <ActionPanel>
            <Action title="HTML" onAction={() => exportHTML(filepath)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="Movie"
        actions={
          <ActionPanel>
            <Action title="QuickTime Movie" onAction={() => exportMovie(filepath)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="Images"
        actions={
          <ActionPanel>
            <Action title="Slide Images" onAction={() => exportImages(filepath)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="Keynote 09"
        actions={
          <ActionPanel>
            <Action title="Keynote 09" onAction={() => exportKeynote09(filepath)} />
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

  showHUD(`Exporting slideshow as PDF...`);
  runAppleScript(`tell application "Keynote"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as PDF
    end tell`);
  popToRoot();
}

function exportPowerPoint(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".pptx")) {
    filepath = filepath + ".pptx";
  }

  showHUD(`Exporting slideshow as Microsoft PowerPoint...`);
  runAppleScript(`tell application "Keynote"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as Microsoft Powerpoint
    end tell`);
  popToRoot();
}

function exportHTML(filepath: string) {
  showHUD(`Exporting slideshow as HTML...`);
  runAppleScript(`tell application "Keynote"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as HTML
    end tell`);
  popToRoot();
}

function exportMovie(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".m4v")) {
    filepath = filepath + ".m4v";
  }

  showHUD(`Exporting slideshow as QuickTime movie...`);
  runAppleScript(`tell application "Keynote"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as QuickTime movie with properties {movie format:native size}
    end tell`);
  popToRoot();
}

function exportImages(filepath: string) {
  showHUD(`Exporting slideshow as slide images...`);
  runAppleScript(`tell application "Keynote"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as slide images
    end tell`);
  popToRoot();
}

function exportKeynote09(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".key")) {
    filepath = filepath + ".key";
  }

  showHUD(`Exporting slideshow as Keynote 09...`);
  runAppleScript(`tell application "Keynote"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as Keynote 09
    end tell`);
  popToRoot();
}
