import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { getFinderPath, isImage, preferences } from "./utils/common-utils";
import { createNewFile, createNewFileByTemplate } from "./new-file-here";
import { codeFileTypes, documentFileTypes, scriptFileTypes, TemplateType } from "./utils/file-type";
import { getFileType } from "./hooks/hooks";
import { parse } from "path";

export default function NewFileWithName(props: {
  newFileType: { section: string; index: number };
  templateFiles: TemplateType[];
}) {
  const preference = preferences();
  const templateFiles = props.templateFiles;
  const [newFileType, setNewFileType] = useState<{ section: string; index: number }>(props.newFileType);
  const [fileName, setFileName] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  //hooks
  const { isSimpleContent, fileExtension } = getFileType(newFileType, templateFiles);

  return (
    <Form
      navigationTitle={"New File with Name"}
      actions={
        <ActionPanel>
          <Action
            title={"New File Here"}
            icon={Icon.Finder}
            onAction={async () => {
              try {
                const path = await getFinderPath();
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
              } catch (e) {
                await showToast(Toast.Style.Failure, "Create File Failed", String(e));
              }
            }}
          />
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
            return (
              <Form.Dropdown.Item
                key={template.name + index}
                icon={isImage(parse(template.path).ext) ? { source: template.path } : { fileIcon: template.path }}
                title={template.name + "." + template.extension}
                value={JSON.stringify({ section: "Template", index: index })}
              />
            );
          })}
        </Form.Dropdown.Section>

        {preference.showDocument && (
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
        {preference.showCode && (
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
        {preference.showScript && (
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
