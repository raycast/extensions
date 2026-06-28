import { Action, ActionPanel, List } from "@raycast/api";
import * as path from "path";

export function FileList({
  filePaths,
  onSelectFile,
}: {
  filePaths: string[];
  onSelectFile: (filePath: string) => void;
}) {
  return (
    <List navigationTitle="FileList">
      <List.Section title="Files">
        {filePaths.map((filePath) => {
          const filename = path.basename(filePath);
          return (
            <List.Item
              title={filename}
              subtitle={filePath}
              key={filePath}
              actions={
                <ActionPanel>
                  <Action
                    title="Select"
                    onAction={() => {
                      onSelectFile(filePath);
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
