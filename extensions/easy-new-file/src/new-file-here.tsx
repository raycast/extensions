import fse from "fs-extra";
import * as XLSX from "xlsx";
import {
  Action,
  ActionPanel,
  environment,
  Icon,
  List,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useState } from "react";
import { copyFileByPath, getFinderPath, isEmpty, isImage, preferences } from "./utils/common-utils";
import { codeFileTypes, documentFileTypes, FileType, scriptFileTypes, TemplateType } from "./utils/file-type";
import NewFileWithName from "./new-file-with-name";
import AddFileTemplate from "./add-file-template";
import { homedir } from "os";
import { getTemplateFile, refreshNumber } from "./hooks/hooks";
import { parse } from "path";

export default function main() {
  const preference = preferences();
  const { push } = useNavigation();
  const templateFolderPath = environment.supportPath + "/templates";
  const [refresh, setRefresh] = useState<number>(0);

  //hooks
  const { templateFiles, isLoading } = getTemplateFile(templateFolderPath, refresh);

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
              icon={isImage(parse(template.path).ext) ? { source: template.path } : { fileIcon: template.path }}
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
                    title={"New File on Desktop"}
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
                  <Action
                    title={"Copy File to Clipboard"}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["ctrl"], key: "c" }}
                    onAction={async () => {
                      await copyFileByPath(template.path);
                      await showHUD(`${template.name} is copied to clipboard.`);
                    }}
                  />
                  <ActionPanel.Section title={"Template Action"}>
                    <Action
                      title={"Add File Template"}
                      icon={Icon.Document}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => {
                        push(<AddFileTemplate setRefresh={setRefresh} />);
                      }}
                    />
                    <Action
                      title={"Delete File Template"}
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={async () => {
                        await showToast(Toast.Style.Animated, "Deleting template...");
                        fse.unlinkSync(template.path);
                        setRefresh(refreshNumber());
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
      {!isLoading && preference.showDocument && (
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
      {!isLoading && preference.showCode && (
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
      {!isLoading && preference.showScript && (
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
  const { push } = useNavigation();
  const { fileType, newFileType, templateFiles, setRefresh } = props;
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
                push(<AddFileTemplate setRefresh={setRefresh} />);
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
  await showCreateToast(isExist, fileName, filePath, desPath);
}

export async function createNewFileByTemplate(template: TemplateType, desPath: string, fileName = "") {
  isEmpty(fileName)
    ? (fileName = buildFileName(desPath, template.name, template.extension))
    : (fileName = fileName + "." + template.extension);
  const filePath = desPath + fileName;
  const isExist = fse.existsSync(filePath);
  if (!isExist) {
    fse.copyFileSync(template.path, filePath);
  }
  await showCreateToast(isExist, fileName, filePath, desPath);
}

const showCreateToast = async (isExist: boolean, fileName: string, filePath: string, folderPath: string) => {
  if (isExist) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "File already exists.",
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
  } else {
    await showHUD(`${fileName} is created in ${folderPath.slice(0, -1)}`);
  }
  if (preferences().createAndOpen) {
    await open(filePath);
  }
};
