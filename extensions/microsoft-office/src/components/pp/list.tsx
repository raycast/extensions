import path from "path";
import { Action, ActionPanel, List } from "@raycast/api";
import { OpenInPowerPointAction } from "./actions";
import { PowerPointFile } from "../../lib/office";

export function PowerPointListItem({ file, executable }: { file: PowerPointFile; executable: string | undefined }) {
  return (
    <List.Item
      key={file.filename}
      icon={"powerpoint.svg"}
      title={path.basename(file.filename)}
      subtitle={path.dirname(file.filename)}
      accessories={[{ date: file.timestampUTC }]}
      actions={
        <ActionPanel>
          <OpenInPowerPointAction filename={file.filename} executable={executable} />
          <Action.ShowInFinder path={file.filename} />
        </ActionPanel>
      }
    />
  );
}
