import path from "path";
import { Action, ActionPanel, List } from "@raycast/api";
import { OpenInExcelAction } from "./actions";
import { ExcelFile } from "../../lib/office";

export function ExcelListItem({ file, executable }: { file: ExcelFile; executable: string | undefined }) {
  return (
    <List.Item
      key={file.filename}
      icon={"excel.svg"}
      title={path.basename(file.filename)}
      subtitle={path.dirname(file.filename)}
      accessories={[{ date: file.timestampUTC }]}
      actions={
        <ActionPanel>
          <OpenInExcelAction filename={file.filename} executable={executable} />
          <Action.ShowInFinder path={file.filename} />
        </ActionPanel>
      }
    />
  );
}
