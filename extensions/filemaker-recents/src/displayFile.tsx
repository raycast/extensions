import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ParsedFilePath } from "./helpers";

export function DisplayFile({ file }: { file: ParsedFilePath & { id: string } }) {
  return (
    <List.Item
      key={file.id}
      icon="FM12Doc.png"
      title={file.fileName}
      subtitle={file.locationName}
      keywords={
        [file.fileName, file.local ? file.path : file.host, !file.local && file.locationName].filter(
          Boolean,
        ) as string[]
      }
      accessories={[file.local && !file.exists ? { icon: Icon.Warning } : {}]}
      actions={
        <ActionPanel>
          {file.local ? (
            file.exists ? (
              <>
                <Action.Open target={file.path} title="Launch File" icon={Icon.ArrowNe} />
                <Action.ShowInFinder path={file.path} />
              </>
            ) : (
              <></>
            )
          ) : (
            <Action.OpenInBrowser url={`fmp://${file.host}/${file.fileName}`} title="Launch File" icon={Icon.ArrowNe} />
          )}
        </ActionPanel>
      }
    />
  );
}
