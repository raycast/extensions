import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { homedir } from "node:os";
import { findSpreadsheets } from "./spreadsheet-files";

/** Search recent spreadsheet files and open them in VisiGrid. */
export default function OpenWorkbook() {
  const { data: files = [], isLoading, error } = useCachedPromise(findSpreadsheets, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search spreadsheets…">
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Document}
        title={error ? "Couldn't Find Spreadsheets" : "No Spreadsheets Found"}
        description={error ? error.message : "No recent .xlsx, .csv, or .sheet files under your home folder."}
      />
      {files.map((f) => (
        <List.Item
          key={f.path}
          title={f.name}
          subtitle={f.path.replace(homedir(), "~")}
          accessories={[{ date: f.modified }]}
          actions={
            <ActionPanel>
              <Action.Open title="Open in VisiGrid" target={f.path} application="VisiGrid" />
              <Action.ShowInFinder path={f.path} />
              <Action.CopyToClipboard title="Copy Path" content={f.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
