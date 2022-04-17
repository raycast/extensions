import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { getFinderPath, isEmpty, preferences } from "./utils/common-utils";
import { createNewFile, createNewFileByTemplate } from "./new-file-here";
import { codeFileTypes, documentFileTypes, scriptFileTypes, TemplateType } from "./utils/file-type";
import { runAppleScript } from "run-applescript";

export default function NewFileWithName(props: {
  newFileType: { section: string; index: number };
  templateFiles: TemplateType[];
}) {
  const preference = preferences();
  const templateFiles = props.templateFiles;
  const [newFileType, setNewFileType] = useState<{ section: string; index: number }>(props.newFileType);

  const [fileExtension, setFileExtension] = useState<string>("txt");
  const [fileName, setFileName] = useState<string>("");
  const [isSimpleContent, setIsSimpleContent] = useState<boolean>(false);
  const [fileContent, setFileContent] = useState<string>("");

  useEffect(() => {
    async function _initAppleScript() {
      await runAppleScript("");
    }

    _initAppleScript().then();
  }, []);

  useEffect(() => {
    async function _initFileType() {
      switch (newFileType.section) {
        case "Template": {
          setFileExtension(templateFiles[newFileType.index].extension);
          setIsSimpleContent(templateFiles[newFileType.index].simpleContent);
          break;
        }
        case "Document": {
          setFileExtension(documentFileTypes[newFileType.index].extension);
          setIsSimpleContent(documentFileTypes[newFileType.index].simpleContent);
          break;
        }
        case "Code": {
          setFileExtension(codeFileTypes[newFileType.index].extension);
          setIsSimpleContent(codeFileTypes[newFileType.index].simpleContent);
          break;
        }
        case "Script": {
          setFileExtension(scriptFileTypes[newFileType.index].extension);
          setIsSimpleContent(scriptFileTypes[newFileType.index].simpleContent);
          break;
        }
        default: {
          setFileExtension(documentFileTypes[0].extension);
          setIsSimpleContent(documentFileTypes[0].simpleContent);
          break;
        }
      }
    }

    _initFileType().then();
  }, [newFileType]);

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
                icon={{ fileIcon: template.path }}
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
