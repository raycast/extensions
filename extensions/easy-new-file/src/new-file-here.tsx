import fse from "fs-extra";
import * as XLSX from "xlsx";
import {
  Action,
  ActionPanel,
  environment,
  getPreferenceValues,
  Icon,
  List,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import React, { useState } from "react";
import { copyFileByPath, getFinderPath, isEmpty, isImage } from "./utils/common-utils";
import { codeFileTypes, documentFileTypes, FileType, scriptFileTypes, TemplateType } from "./types/file-type";
import NewFileWithName from "./new-file-with-name";
import AddFileTemplate from "./add-file-template";
import { homedir } from "os";
import { alertDialog, getTemplateFile, refreshNumber } from "./hooks/hooks";
import { parse } from "path";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import { Preferences } from "./types/preferences";
import { ListEmptyView } from "./components/list-empty-view";

export default function main() {
  const { showDocument, showCode, showScript } = getPreferenceValues<Preferences>();
  const templateFolderPath = environment.supportPath + "/templates";
  const [refresh, setRefresh] = useState<number>(0);

  //hooks
  const { templateFiles, isLoading } = getTemplateFile(templateFolderPath, refresh);

  return (
    <List
      isShowingDetail={false}
      isLoading={isLoading}
      searchBarPlaceholder={"Search and create files"}
      selectedItemId={templateFiles.length > 0 ? templateFiles[0].path : ""}
    >
      <ListEmptyView
        title={"No templates"}
        description={"You can add template from the Action Panel"}
        setRefresh={setRefresh}
      />
      <List.Section title={"Template"}>
        {templateFiles.map((template, index, array) => {
          return (
            <List.Item
              id={template.path}
              key={template.path}
              icon={isImage(parse(template.path).ext) ? { source: template.path } : { fileIcon: template.path }}
              title={{ value: template.name, tooltip: template.name + "." + template.extension }}
              subtitle={template.extension.toUpperCase()}
              actions={
                <ActionPanel>
                  <Action
                    title={"New File Here"}
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
                    title="New File with Name"
                    icon={Icon.TextDocument}
                    target={
                      <NewFileWithName newFileType={{ section: "Template", index: index }} templateFiles={array} />
                    }
                  />
                  <Action
                    title={"New File on Desktop"}
                    icon={Icon.Window}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      try {
                        await createNewFileByTemplate(template, `${homedir()}/Desktop/`);
                      } catch (e) {
                        await showToast(Toast.Style.Failure, "Create file failure.", String(e));
                      }
                    }}
                  />
                  <Action
                    title={"Copy File to Clipboard"}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                    onAction={async () => {
                      await copyFileByPath(template.path);
                      await showHUD(`${template.name} copied to clipboard.`);
                    }}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title={"Add File Template"}
                      icon={Icon.Document}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      target={<AddFileTemplate setRefresh={setRefresh} />}
                    />
                    <Action
                      title={"Remove File Template"}
                      icon={Icon.Trash}
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
                            setRefresh(refreshNumber());
                            await showToast(Toast.Style.Success, "Remove template success!");
                          }
                        );
                      }}
                    />
                    <Action.OpenWith shortcut={{ modifiers: ["cmd"], key: "o" }} path={template.path} />
                  </ActionPanel.Section>

                  <ActionOpenCommandPreferences />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {!isLoading && showDocument && (
        <List.Section title={"Document"}>
          {documentFileTypes.map((fileType, index) => {
            return (
              <FileTypeItem
                key={fileType.languageId}
                fileType={fileType}
                newFileType={{ section: "Document", index: index }}
                templateFiles={templateFiles}
                setRefresh={setRefresh}
              />
            );
          })}
        </List.Section>
      )}
      {!isLoading && showCode && (
        <List.Section title={"Code"}>
          {codeFileTypes.map((fileType, index) => {
            return (
              <FileTypeItem
                key={fileType.languageId}
                fileType={fileType}
                newFileType={{ section: "Code", index: index }}
                templateFiles={templateFiles}
                setRefresh={setRefresh}
              />
            );
          })}
        </List.Section>
      )}
      {!isLoading && showScript && (
        <List.Section title={"Script"}>
          {scriptFileTypes.map((fileType, index) => {
            return (
              <FileTypeItem
                key={fileType.languageId}
                fileType={fileType}
                newFileType={{ section: "Script", index: index }}
                templateFiles={templateFiles}
                setRefresh={setRefresh}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function FileTypeItem(props: {
  fileType: FileType;
  newFileType: { section: string; index: number };
  templateFiles: TemplateType[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { fileType, newFileType, templateFiles, setRefresh } = props;
  return (
    <List.Item
      icon={{ source: fileType.icon }}
      title={{ value: fileType.name, tooltip: fileType.name + "." + fileType.extension }}
      actions={
        <ActionPanel>
          <Action
            title={"New File Here"}
            icon={Icon.Finder}
            onAction={async () => {
              try {
                await createNewFile(fileType, await getFinderPath());
              } catch (e) {
                await showToast(Toast.Style.Failure, "Create file failure.", String(e));
              }
            }}
          />
          <Action.Push
            title="New File with Name"
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
                await showToast(Toast.Style.Failure, "Create file failure.", String(e));
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
      }
    />
  );
}

export function buildFileName(path: string, name: string, extension: string) {
  const directoryExists = fse.existsSync(path + name + "." + extension);
  if (!directoryExists) {
    return name + "." + extension;
  } else {
    let index = 2;
    while (directoryExists) {
      const newName = name + " " + index + "." + extension;
      const directoryExists = fse.existsSync(path + newName);
      if (!directoryExists) {
        return newName;
      }
      index++;
    }
    return name + "-" + index + "." + extension;
  }
}

export async function createNewFile(fileType: FileType, desPath: string, fileName = "", fileContent = "") {
  isEmpty(fileName)
    ? (fileName = buildFileName(desPath, fileType.name, fileType.extension))
    : (fileName = fileName + "." + fileType.extension);
  const filePath = desPath + fileName;
  if (fileType.name === "Excel") {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, filePath);
  } else {
    fse.writeFileSync(filePath, fileContent);
  }

  await showCreateSuccess(fileName, filePath, desPath);
}

export async function createNewFileByTemplate(template: TemplateType, desPath: string, fileName = "") {
  isEmpty(fileName)
    ? (fileName = buildFileName(desPath, template.name, template.extension))
    : (fileName = fileName + "." + template.extension);
  const filePath = desPath + fileName;
  fse.copyFileSync(template.path, filePath);
  await showCreateSuccess(fileName, filePath, desPath);
}

const showCreateSuccess = async (fileName: string, filePath: string, folderPath: string) => {
  await showHUD(`${fileName} created in ${folderPath.slice(0, -1)}`);
  if (getPreferenceValues<Preferences>().createAndOpen) {
    await open(filePath);
  }
};
