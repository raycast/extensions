import path from "path";
import { ActionPanel, List } from "@raycast/api";
import { OpenInExcelAction } from "./actions";
import { WordFile } from "../../lib/office";

export function ExcelListItem({ file, executable }: { file: WordFile; executable: string | undefined }) {
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
        </ActionPanel>
      }
    />
  );
}
