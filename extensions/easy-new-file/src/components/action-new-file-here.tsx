import { Action, ActionPanel, Icon, Toast } from "@raycast/api";
import { getFinderPath, showCustomToast } from "../utils/common-utils";
import NewFileWithDetails from "../new-file-with-details";
import { homedir } from "os";
import AddFileTemplate from "../add-file-template";
import React from "react";
import { createNewFile } from "../new-file-with-template";
import { FileType, TemplateType } from "../types/file-type";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { MutatePromise } from "@raycast/utils";

export function ActionNewFileHere(props: {
  fileType: FileType;
  newFileType: { section: string; index: number };
  templateFiles: TemplateType[];
  folder: string;
  mutate: MutatePromise<TemplateType[]>;
}) {
  const { fileType, newFileType, templateFiles, folder, mutate } = props;
  return (
    <ActionPanel>
      <Action
        title={`New File in ${folder}`}
        icon={Icon.Finder}
        onAction={async () => {
          try {
            await createNewFile(fileType, await getFinderPath());
          } catch (e) {
            await showCustomToast({
              title: "Failed to create file.",
              message: String(e),
              style: Toast.Style.Failure,
            });
          }
        }}
      />
      <Action.Push
        title="New File with Details"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        icon={Icon.NewDocument}
        target={
          <NewFileWithDetails
            newFileType={newFileType}
            templateFiles={templateFiles}
            folder={folder}
            isLoading={false}
            navigationTitle={"New File with Details"}
          />
        }
      />
      {folder !== "Desktop" && (
        <Action
          title={"New File in Desktop"}
          icon={Icon.Desktop}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={async () => {
            try {
              await createNewFile(fileType, `${homedir()}/Desktop/`);
            } catch (e) {
              await showCustomToast({
                title: "Failed to create file.",
                message: String(e),
                style: Toast.Style.Failure,
              });
            }
          }}
        />
      )}
      <ActionPanel.Section>
        <Action.Push
          title={"Add File Template"}
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          target={<AddFileTemplate mutate={mutate} />}
        />
      </ActionPanel.Section>
      <ActionOpenCommandPreferences />
    </ActionPanel>
  );
}
