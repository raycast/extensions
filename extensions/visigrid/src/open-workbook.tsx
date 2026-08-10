import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { findSpreadsheets, SheetFile } from "./spreadsheet-files";

/** Search recent spreadsheet files and open them in VisiGrid. */
export default function OpenWorkbook() {
  const [files, setFiles] = useState<SheetFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    findSpreadsheets()
      .then(setFiles)
      .finally(() => setLoading(false));
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search spreadsheets…">
      {files.map((f) => (
        <List.Item
          key={f.path}
          title={f.name}
          subtitle={f.path.replace(process.env.HOME ?? "", "~")}
          accessories={[{ date: f.modified }]}
          actions={
            <ActionPanel>
              <Action.Open
                title="Open in VisiGrid"
                target={f.path}
                application="VisiGrid"
              />
              <Action.ShowInFinder path={f.path} />
              <Action.CopyToClipboard title="Copy Path" content={f.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
