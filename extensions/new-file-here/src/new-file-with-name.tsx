import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { getFinderPath, isEmpty, preferences } from "./utils";
import { createFileName, createNewFile, createNewFileByTemplate } from "./new-file-here";
import { codeFileTypes, documentFileTypes, FileType, scriptFileTypes, TemplateType } from "./file-type";
import { runAppleScript } from "run-applescript";

export default function NewFileWithName(props: {
  newFileType: { section: string; index: number };
  templateFiles: TemplateType[];
}) {
  const preference = preferences();

  const [newFileType, setNewFileType] = useState<{ section: string; index: number }>(props.newFileType);
  const templateFiles = props.templateFiles;
  const [isSimpleContent, setIsSimpleContent] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");

  useEffect(() => {
    async function _initAppleScript() {
      await runAppleScript("");
    }

    _initAppleScript().then();
  }, []);

  useEffect(() => {
    async function _fetchIsSimpleContent() {
      switch (newFileType.section) {
        case "Template": {
          setIsSimpleContent(templateFiles[newFileType.index].simpleContent);
          break;
        }
        case "Document": {
          setIsSimpleContent(documentFileTypes[newFileType.index].simpleContent);
          break;
        }
        case "Code": {
          setIsSimpleContent(codeFileTypes[newFileType.index].simpleContent);
          break;
        }
        case "Script": {
          setIsSimpleContent(scriptFileTypes[newFileType.index].simpleContent);
          break;
        }
        default: {
          setIsSimpleContent(false);
          break;
        }
      }
    }

    _fetchIsSimpleContent().then();
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
                let _fileName = fileName;
                const _createNewFile = async (buildFiles: FileType[], index = newFileType.index) => {
                  if (isEmpty(_fileName)) {
                    _fileName = createFileName(buildFiles[index].name, buildFiles[index].extension);
                  }
                  await createNewFile(buildFiles[index], await getFinderPath(), _fileName, fileContent);
                };
                switch (newFileType.section) {
                  case "Template": {
                    if (isEmpty(_fileName)) {
                      _fileName = createFileName(
                        templateFiles[newFileType.index].name,
                        templateFiles[newFileType.index].extension
                      );
                    }
                    await createNewFileByTemplate(
                      templateFiles[newFileType.index],
                      await getFinderPath(),
                      templateFiles[newFileType.index].path,
                      _fileName
                    );
                    break;
                  }
                  case "Document": {
                    await _createNewFile(documentFileTypes);
                    break;
                  }
                  case "Code": {
                    await _createNewFile(codeFileTypes);
                    break;
                  }
                  case "Script": {
                    await _createNewFile(scriptFileTypes);
                    break;
                  }
                  default: {
                    await _createNewFile(documentFileTypes, 0);
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
                icon={{ source: Icon.TextDocument }}
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
          switch (newFileType.section) {
            case "Template": {
              setFileName(newValue + "." + templateFiles[newFileType.index].extension);
              break;
            }
            case "Document": {
              setFileName(newValue + "." + documentFileTypes[newFileType.index].extension);
              break;
            }
            case "Code": {
              setFileName(newValue + "." + codeFileTypes[newFileType.index].extension);
              break;
            }
            case "Script": {
              setFileName(newValue + "." + scriptFileTypes[newFileType.index].extension);
              break;
            }
            default: {
              setFileName(newValue + "." + documentFileTypes[0].extension);
              break;
            }
          }
        }}
      />
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
