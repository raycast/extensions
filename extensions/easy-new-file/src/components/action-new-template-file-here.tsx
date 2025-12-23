import { Action, ActionPanel, Clipboard, Icon, Toast } from "@raycast/api";
import { getFinderPath, showCustomHUD, showCustomToast } from "../utils/common-utils";
import NewFileWithDetails from "../new-file-with-details";
import { homedir } from "os";
import AddFileTemplate from "../add-file-template";
import React from "react";
import { createNewFileByTemplate } from "../new-file-with-template";
import { TemplateType } from "../types/file-type";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { alertDialog } from "../hooks/hooks";
import fse from "fs-extra";
import { MutatePromise } from "@raycast/utils";

export function ActionNewTemplateFileHere(props: {
  template: TemplateType;
  index: number;
  templateFiles: TemplateType[];
  folder: string;
  mutate: MutatePromise<TemplateType[]>;
}) {
  const { template, index, templateFiles, folder, mutate } = props;
  return (
    <ActionPanel>
      <Action
        title={`New File in ${folder}`}
        icon={Icon.Finder}
        onAction={async () => {
          try {
            await createNewFileByTemplate(template, await getFinderPath());
          } catch (e) {
            await showCustomToast({ title: "Fetch path success!", message: String(e), style: Toast.Style.Failure });
          }
        }}
      />
      <Action.Push
        title="New File with Details"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        icon={Icon.NewDocument}
        target={
          <NewFileWithDetails
            newFileType={{ section: "Template", index: index }}
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
              await createNewFileByTemplate(template, `${homedir()}/Desktop/`);
            } catch (e) {
              await showCustomToast({ title: "Create file failure.", message: String(e), style: Toast.Style.Failure });
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
            await showCustomHUD({ title: `📋 ${template.name} copied to clipboard` });
          }}
        />
        <Action
          title={"Paste to Front App"}
          icon={Icon.AppWindow}
          shortcut={{ modifiers: ["shift", "cmd"], key: "v" }}
          onAction={async () => {
            await Clipboard.paste({ file: template.path });
            await showCustomHUD({ title: `📋 ${template.name} pasted to front app` });
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
          target={<AddFileTemplate mutate={mutate} />}
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
                await showCustomToast({ title: "Removing template...", style: Toast.Style.Animated });
                fse.removeSync(template.path);
                await mutate();
                await showCustomToast({ title: "Remove template success!", style: Toast.Style.Success });
              },
            );
          }}
        />
      </ActionPanel.Section>

      <ActionOpenCommandPreferences />
    </ActionPanel>
  );
}
