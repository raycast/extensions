import React, { useState } from "react";
import { Action, ActionPanel, Form, Icon, Toast } from "@raycast/api";
import { getFinderPath, isImage, showCustomToast } from "./utils/common-utils";
import { createNewFile, createNewFileByTemplate } from "./new-file-with-template";
import { codeFileTypes, documentFileTypes, scriptFileTypes, TemplateType } from "./types/file-type";
import { getFileType } from "./hooks/hooks";
import { parse } from "path";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import { homedir } from "os";
import { showCode, showDocument, showScript } from "./types/preferences";

export default function NewFileWithDetails(props: {
  newFileType: { section: string; index: number };
  templateFiles: TemplateType[];
  folder: string;
  isLoading: boolean;
  navigationTitle: string;
}) {
  const templateFiles = props.templateFiles;
  const [newFileType, setNewFileType] = useState<{ section: string; index: number }>(props.newFileType);
  const [fileName, setFileName] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  //hooks
  const { isSimpleContent, fileExtension } = getFileType(newFileType, templateFiles);

  return (
    <Form
      isLoading={props.isLoading || false}
      navigationTitle={props.navigationTitle}
      actions={
        <ActionPanel>
          <Action
            title={`New File in ${props.folder}`}
            icon={Icon.Finder}
            onAction={async () => {
              try {
                const path = await getFinderPath();
                await createFileWithName(newFileType, templateFiles, path, fileName, fileContent);
              } catch (e) {
                await showCustomToast({
                  title: "Failed to create file",
                  message: String(e),
                  style: Toast.Style.Failure,
                });
              }
            }}
          />
          {props.folder !== "Desktop" && (
            <Action
              title={"New File in Desktop"}
              icon={Icon.Desktop}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                try {
                  const path = `${homedir()}/Desktop/`;
                  await createFileWithName(newFileType, templateFiles, path, fileName, fileContent);
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
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id={"FileType"}
        key={"FileType"}
        title={"Type"}
        defaultValue={JSON.stringify(props.newFileType)}
        onChange={(newValue) => {
          const newFile = JSON.parse(newValue) as { section: string; index: number };
          setNewFileType(newFile);
        }}
      >
        <Form.Dropdown.Section title={"Template"}>
          {templateFiles.map((template, index) => {
            let title: string;
            if (template.name.startsWith(".")) {
              title = template.name;
            } else {
              title = template.name + "." + template.extension;
            }
            return (
              <Form.Dropdown.Item
                key={template.name + index}
                icon={isImage(parse(template.path).ext) ? { source: template.path } : { fileIcon: template.path }}
                title={title}
                value={JSON.stringify({ section: "Template", index: index })}
              />
            );
          })}
        </Form.Dropdown.Section>

        {showDocument && (
          <Form.Dropdown.Section title={"Document"}>
            {documentFileTypes.map((fileType, index) => {
              return (
                <Form.Dropdown.Item
                  key={fileType.languageId}
                  icon={{ source: fileType.icon }}
                  title={fileType.name}
                  value={JSON.stringify({ section: "Document", index: index })}
                />
              );
            })}
          </Form.Dropdown.Section>
        )}
        {showCode && (
          <Form.Dropdown.Section title={"Code"}>
            {codeFileTypes.map((fileType, index) => {
              return (
                <Form.Dropdown.Item
                  key={fileType.languageId}
                  icon={{ source: fileType.icon }}
                  title={fileType.name}
                  value={JSON.stringify({ section: "Code", index: index })}
                />
              );
            })}
          </Form.Dropdown.Section>
        )}
        {showScript && (
          <Form.Dropdown.Section title={"Script"}>
            {scriptFileTypes.map((fileType, index) => {
              return (
                <Form.Dropdown.Item
                  key={fileType.languageId}
                  icon={{ source: fileType.icon }}
                  title={fileType.name}
                  value={JSON.stringify({ section: "Script", index: index })}
                />
              );
            })}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      <Form.TextField
        id={"Filename"}
        title={"Name"}
        placeholder={"File name without extension (Optional)"}
        onChange={(newValue) => {
          setFileName(newValue);
        }}
      />
      <Form.Description title={"Extension"} text={fileExtension} />
      {isSimpleContent && (
        <Form.TextArea
          id={"FileContent"}
          title={"Content"}
          placeholder={"File content (Optional)"}
          onChange={(newValue) => {
            setFileContent(newValue);
          }}
        />
      )}
    </Form>
  );
}

const createFileWithName = async (
  newFileType: { section: string; index: number },
  templateFiles: TemplateType[],
  path: string,
  fileName: string,
  fileContent: string,
) => {
  switch (newFileType.section) {
    case "Template": {
      await createNewFileByTemplate(templateFiles[newFileType.index], path, fileName);
      break;
    }
    case "Document": {
      await createNewFile(documentFileTypes[newFileType.index], path, fileName, fileContent);
      break;
    }
    case "Code": {
      await createNewFile(codeFileTypes[newFileType.index], path, fileName, fileContent);
      break;
    }
    case "Script": {
      await createNewFile(scriptFileTypes[newFileType.index], path, fileName, fileContent);
      break;
    }
    default: {
      await createNewFile(documentFileTypes[0], path, fileName, fileContent);
      break;
    }
  }
};
