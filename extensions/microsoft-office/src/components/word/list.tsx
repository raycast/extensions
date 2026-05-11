import path from "path";
import { Action, ActionPanel, List } from "@raycast/api";
import { OpenInWordAction } from "./actions";
import { WordFile } from "../../lib/office";

export function WordListItem({ file, executable }: { file: WordFile; executable: string | undefined }) {
  return (
    <List.Item
      key={file.filename}
      icon={"word.svg"}
      title={path.basename(file.filename)}
      subtitle={path.dirname(file.filename)}
      accessories={[{ date: file.timestampUTC }]}
      actions={
        <ActionPanel>
          <OpenInWordAction filename={file.filename} executable={executable} />
          <Action.ShowInFinder path={file.filename} />
        </ActionPanel>
      }
    />
  );
}
