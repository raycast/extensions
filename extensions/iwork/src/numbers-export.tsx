import { showHUD, ActionPanel, List, Action, popToRoot, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkNumbersInstalled, resolveExportPath } from "./index";

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

  // Check for Numbers app
  Promise.resolve(checkNumbersInstalled()).then((installed) => {
    if (!installed) {
      popToRoot();
    }
  });

  // Check whether there is an active document
  Promise.resolve(
    runAppleScript(`try
      tell application "Numbers" to get document 1
    end try`)
  ).then((document) => {
    if (!document) {
      showHUD(`No active spreadsheet to export!`);
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
        title="Excel"
        actions={
          <ActionPanel>
            <Action title="Microsoft Excel" onAction={() => exportExcel(filepath)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="CSV"
        actions={
          <ActionPanel>
            <Action title="CSV" onAction={() => exportCSV(filepath)} />
          </ActionPanel>
        }
      />

      <List.Item
        title="Numbers 09"
        actions={
          <ActionPanel>
            <Action title="Numbers 09" onAction={() => exportNumbers09(filepath)} />
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
  runAppleScript(`tell application "Numbers"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as PDF
    end tell`);
  popToRoot();
}

function exportExcel(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".xlsx")) {
    filepath = filepath + ".xlsx";
  }

  showHUD(`Exporting document as Microsoft Excel...`);
  runAppleScript(`tell application "Numbers"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as Microsoft Excel
    end tell`);
  popToRoot();
}

function exportCSV(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".csv")) {
    filepath = filepath + ".csv";
  }

  showHUD(`Exporting document as CSV...`);
  runAppleScript(`tell application "Numbers"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as CSV
    end tell`);
  popToRoot();
}

function exportNumbers09(filepath: string) {
  // Ensure complete filename
  if (!filepath.endsWith(".numbers")) {
    filepath = filepath + ".numbers";
  }

  showHUD(`Exporting document as Numbers 09...`);
  runAppleScript(`tell application "Numbers"
    set theDoc to document 1
    set filePath to "${filepath}" as POSIX file
    export theDoc to filePath as Numbers 09
    end tell`);
  popToRoot();
}
