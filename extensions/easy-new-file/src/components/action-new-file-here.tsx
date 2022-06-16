import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { getFinderPath } from "../utils/common-utils";
import NewFileWithName from "../new-file-with-name";
import { homedir } from "os";
import AddFileTemplate from "../add-file-template";
import React from "react";
import { createNewFile } from "../new-file-here";
import { FileType, TemplateType } from "../types/file-type";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function ActionNewFileHere(props: {
  fileType: FileType;
  newFileType: { section: string; index: number };
  templateFiles: TemplateType[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { fileType, newFileType, templateFiles, setRefresh } = props;
  return (
    <ActionPanel>
      <Action
        title={"New File Here"}
        icon={Icon.Finder}
        onAction={async () => {
          try {
            await createNewFile(fileType, await getFinderPath());
          } catch (e) {
            await showToast(Toast.Style.Failure, "Failed to create file.", String(e));
          }
        }}
      />
      <Action.Push
        title="New File with Name"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        icon={Icon.TextDocument}
        target={<NewFileWithName newFileType={newFileType} templateFiles={templateFiles} />}
      />
      <Action
        title={"New File in Desktop"}
        icon={Icon.Window}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={async () => {
          try {
            await createNewFile(fileType, `${homedir()}/Desktop/`);
          } catch (e) {
            await showToast(Toast.Style.Failure, "Failed to create file.", String(e));
          }
        }}
      />
      <ActionPanel.Section>
        <Action.Push
          title={"Add File Template"}
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          target={<AddFileTemplate setRefresh={setRefresh} />}
        />
      </ActionPanel.Section>
      <ActionOpenCommandPreferences />
    </ActionPanel>
  );
}
