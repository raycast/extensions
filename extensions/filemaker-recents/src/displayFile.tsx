import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ParsedFilePath } from "./helpers";
import { existsSync } from "fs";

export function DisplayFile({ file }: { file: ParsedFilePath & { id: string } }) {
  const exists = file.local ? existsSync(file.path) : true;
  return (
    <List.Item
      key={file.id}
      icon="list-icon.png"
      title={file.fileName}
      subtitle={file.locationName}
      accessories={[!exists ? { icon: Icon.Warning } : {}]}
      actions={
        <ActionPanel>
          {file.local ? (
            exists ? (
              <>
                <Action.Open target={file.path} title="Launch File" />
                <Action.ShowInFinder path={file.path} />
              </>
            ) : (
              <></>
            )
          ) : (
            <Action.OpenInBrowser url={`fmp://${file.host}/${file.fileName}`} title="Launch File" />
          )}
        </ActionPanel>
      }
    />
  );
}
