import { Action, ActionPanel, Clipboard, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { getFinderPath } from "../utils/common-utils";
import NewFileWithDetails from "../new-file-with-details";
import { homedir } from "os";
import AddFileTemplate from "../add-file-template";
import React from "react";
import { createNewFileByTemplate } from "../new-file-with-template";
import { TemplateType } from "../types/file-type";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { alertDialog } from "../hooks/hooks";
import fse from "fs-extra";

export function ActionNewTemplateFileHere(props: {
  template: TemplateType;
  index: number;
  templateFiles: TemplateType[];
  folder: string;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { template, index, templateFiles, folder, setRefresh } = props;
  return (
    <ActionPanel>
      <Action
        title={`New File in ${folder}`}
        icon={Icon.Finder}
        onAction={async () => {
          try {
            await createNewFileByTemplate(template, await getFinderPath());
          } catch (e) {
            await showToast(Toast.Style.Failure, "Create file failure.", String(e));
          }
        }}
      />
      <Action.Push
        title="New File with Details"
        icon={Icon.NewDocument}
        target={
          <NewFileWithDetails
            newFileType={{ section: "Template", index: index }}
            templateFiles={templateFiles}
            folder={folder}
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
              await createNewFileByTemplate(template, `${homedir()}/Desktop/`);
            } catch (e) {
              await showToast(Toast.Style.Failure, "Create file failure.", String(e));
            }
          }}
        />
      )}
      <ActionPanel.Section>
        <Action
          title={"Copy to Clipboard"}
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
          onAction={async () => {
            await Clipboard.copy({ file: template.path });
            await showHUD(`📋 ${template.name} copied to clipboard`);
          }}
        />
        <Action
          title={"Paste to Front App"}
          icon={Icon.AppWindow}
          shortcut={{ modifiers: ["shift", "cmd"], key: "v" }}
          onAction={async () => {
            await Clipboard.paste({ file: template.path });
            await showHUD(`📋 ${template.name} pasted to front app`);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenWith shortcut={{ modifiers: ["cmd"], key: "o" }} path={template.path} />
        <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
        <Action.Push
          title={"Add File Template"}
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          target={<AddFileTemplate setRefresh={setRefresh} />}
        />
        <Action
          title={"Remove File Template"}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            await alertDialog(
              Icon.Trash,
              "Remove Template",
              `Are you sure you want to remove the ${template.name + "." + template.extension}?`,
              "Remove",
              async () => {
                await showToast(Toast.Style.Animated, "Removing template...");
                fse.removeSync(template.path);
                setRefresh(Date.now());
                await showToast(Toast.Style.Success, "Remove template success!");
              },
            );
          }}
        />
      </ActionPanel.Section>

      <ActionOpenCommandPreferences />
    </ActionPanel>
  );
}
