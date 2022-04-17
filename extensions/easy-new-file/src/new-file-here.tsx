import fse from "fs-extra";
import * as XLSX from "xlsx";
import { Action, ActionPanel, environment, Icon, List, open, showToast, Toast, useNavigation } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { getFileInfo, getFinderPath, isEmpty, preferences } from "./utils/common-utils";
import { codeFileTypes, documentFileTypes, FileType, scriptFileTypes, TemplateType } from "./utils/file-type";
import { runAppleScript } from "run-applescript";
import NewFileWithName from "./new-file-with-name";
import AddFileTemplate from "./add-file-template";
import { homedir } from "os";

export default function main() {
  const preference = preferences();
  const templateFolderPath = environment.supportPath + "/templates";
  const [templateFiles, setTemplateFiles] = useState<TemplateType[]>([]);
  const [updateList, setUpdateList] = useState<number[]>([0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function _fetchTemplateFile() {
      const _templateFiles: TemplateType[] = [];
      try {
        if (fse.existsSync(templateFolderPath)) {
          fse.readdirSync(templateFolderPath).forEach((file) => {
            if (!file.startsWith(".")) {
              const filePath = templateFolderPath + "/" + file;
              const { nameWithoutExtension, extension } = getFileInfo(filePath);
              _templateFiles.push({
                path: filePath,
                name: nameWithoutExtension,
                extension: extension,
                simpleContent: false,
              });
            }
          });
          setIsLoading(false);
        } else {
          fse.mkdirSync(templateFolderPath);
        }
      } catch (e) {
        await showToast(Toast.Style.Failure, String(e));
      }
      setTemplateFiles(_templateFiles);
      await runAppleScript("");
    }

    _fetchTemplateFile().then();
  }, [updateList]);

  return (
    <List
      isShowingDetail={false}
      isLoading={isLoading}
      searchBarPlaceholder={"Search and create file"}
      selectedItemId={templateFiles.length > 0 ? templateFiles[0].path : ""}
    >
      <List.Section title={"Template"}>
        {templateFiles.map((template, index, array) => {
          return (
            <List.Item
              id={template.path}
              key={template.path}
              icon={{ fileIcon: template.path }}
              title={template.name}
              subtitle={template.extension}
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
                  <Action
                    title={"New File with Name"}
                    icon={Icon.TextDocument}
                    onAction={() => {
                      push(
                        <NewFileWithName newFileType={{ section: "Template", index: index }} templateFiles={array} />
                      );
                    }}
                  />
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
                  <ActionPanel.Section title={"Template Action"}>
                    <Action
                      title={"Add File Template"}
                      icon={Icon.Document}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => {
                        push(<AddFileTemplate updateListUseState={[updateList, setUpdateList]} />);
                      }}
                    />
                    <Action
                      title={"Delete File Template"}
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={async () => {
                        await showToast(Toast.Style.Animated, "Deleting template...");
                        fse.unlinkSync(template.path);
                        const _templateFiles = [...templateFiles];
                        _templateFiles.splice(index, 1);
                        setTemplateFiles(_templateFiles);
                        await showToast(Toast.Style.Success, "Delete template success!");
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {preference.showDocument && (
        <List.Section title={"Document"}>
          {documentFileTypes.map((fileType, index) => {
            return (
              <FileTypeItem
                key={fileType.languageId}
                fileType={fileType}
                newFileType={{ section: "Document", index: index }}
                templateFiles={templateFiles}
                updateListUseState={[updateList, setUpdateList]}
              />
            );
          })}
        </List.Section>
      )}
      {preference.showCode && (
        <List.Section title={"Code"}>
          {codeFileTypes.map((fileType, index) => {
            return (
              <FileTypeItem
                key={fileType.languageId}
                fileType={fileType}
                newFileType={{ section: "Code", index: index }}
                templateFiles={templateFiles}
                updateListUseState={[updateList, setUpdateList]}
              />
            );
          })}
        </List.Section>
      )}
      {preference.showScript && (
        <List.Section title={"Script"}>
          {scriptFileTypes.map((fileType, index) => {
            return (
              <FileTypeItem
                key={fileType.languageId}
                fileType={fileType}
                newFileType={{ section: "Script", index: index }}
                templateFiles={templateFiles}
                updateListUseState={[updateList, setUpdateList]}
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
  updateListUseState: [number[], React.Dispatch<React.SetStateAction<number[]>>];
}) {
  const { push } = useNavigation();
  const fileType = props.fileType;
  const newFileType = props.newFileType;
  const templateFiles = props.templateFiles;
  const [updateList, setUpdateList] = props.updateListUseState;
  return (
    <List.Item
      icon={{ source: fileType.icon }}
      title={fileType.name}
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
          <Action
            title={"New File with Name"}
            icon={Icon.TextDocument}
            onAction={() => {
              push(<NewFileWithName newFileType={newFileType} templateFiles={templateFiles} />);
            }}
          />
          <Action
            title={"New File in Desktop"}
            icon={Icon.Desktop}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              try {
                await createNewFile(fileType, `${homedir()}/Desktop/`);
              } catch (e) {
                await showToast(Toast.Style.Failure, "Create file failure.", String(e));
              }
            }}
          />
          <ActionPanel.Section title={"Template Action"}>
            <Action
              title={"Add File Template"}
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => {
                push(<AddFileTemplate updateListUseState={[updateList, setUpdateList]} />);
              }}
            />
          </ActionPanel.Section>
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
  await showToast(Toast.Style.Animated, "Creating file...");
  isEmpty(fileName)
    ? (fileName = buildFileName(desPath, fileType.name, fileType.extension))
    : (fileName = fileName + "." + fileType.extension);
  const filePath = desPath + fileName;
  const isExist = fse.existsSync(filePath);
  if (!isExist) {
    if (fileType.name === "Excel") {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, filePath);
    } else {
      fse.writeFileSync(filePath, fileContent);
    }
  }
  await showCreateToast(isExist, filePath, desPath);
}

export async function createNewFileByTemplate(template: TemplateType, desPath: string, fileName = "") {
  await showToast(Toast.Style.Animated, "Creating file...");
  isEmpty(fileName)
    ? (fileName = buildFileName(desPath, template.name, template.extension))
    : (fileName = fileName + "." + template.extension);
  const filePath = desPath + fileName;
  const isExist = fse.existsSync(filePath);
  if (!isExist) {
    fse.copyFileSync(template.path, filePath);
  }
  await showCreateToast(isExist, filePath, desPath);
}

const showCreateToast = async (isExist: boolean, filePath: string, folderPath: string) => {
  const options: Toast.Options = {
    style: isExist ? Toast.Style.Failure : Toast.Style.Success,
    title: isExist ? "File already exists." : "Create file success!",
    message: "Click to open file.",
    primaryAction: {
      title: "Open file",
      onAction: async (toast) => {
        await open(filePath);
        await toast.hide();
      },
    },
    secondaryAction: {
      title: "Reveal in finder",
      onAction: async (toast) => {
        await open(folderPath);
        await toast.hide();
      },
    },
  };
  await showToast(options);
};
