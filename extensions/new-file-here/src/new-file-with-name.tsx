import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { getFinderPath, isEmpty, preferences } from "./utils";
import { createFileName, createNewFile } from "./new-file-here";
import { codeFileTypes, documentFileTypes, FileType, scriptFileTypes } from "./file-type";
import { runAppleScript } from "run-applescript";

export default function NewFileWithName(props: { fileType: FileType }) {
  const preference = preferences();
  const _fileType = props.fileType;
  const [fileType, setFileType] = useState<FileType>(_fileType);
  const [fileName, setFileName] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");

  useEffect(() => {
    async function _initRunAppleScript() {
      await runAppleScript("");
    }

    _initRunAppleScript().then();
  }, []);

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
                if (isEmpty(_fileName)) {
                  _fileName = createFileName(fileType);
                }
                await createNewFile(fileType, await getFinderPath(), _fileName, fileContent);
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
        title={"File Type"}
        defaultValue={JSON.stringify(_fileType)}
        onChange={(newValue) => {
          setFileType(JSON.parse(newValue) as FileType);
        }}
      >
        {preference.showDocument && (
          <Form.Dropdown.Section title={"Document"}>
            {documentFileTypes.map((fileType) => {
              return (
                <Form.Dropdown.Item
                  key={fileType.languageId}
                  icon={{ source: fileType.icon }}
                  title={fileType.name}
                  value={JSON.stringify(fileType)}
                />
              );
            })}
          </Form.Dropdown.Section>
        )}
        {preference.showCode && (
          <Form.Dropdown.Section title={"Code"}>
            {codeFileTypes.map((fileType) => {
              return (
                <Form.Dropdown.Item
                  key={fileType.languageId}
                  icon={{ source: fileType.icon }}
                  title={fileType.name}
                  value={JSON.stringify(fileType)}
                />
              );
            })}
          </Form.Dropdown.Section>
        )}
        {preference.showScript && (
          <Form.Dropdown.Section title={"Script"}>
            {scriptFileTypes.map((fileType) => {
              return (
                <Form.Dropdown.Item
                  key={fileType.languageId}
                  icon={{ source: fileType.icon }}
                  title={fileType.name}
                  value={JSON.stringify(fileType)}
                />
              );
            })}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      <Form.TextField
        id={"Filename"}
        title={"File Name"}
        placeholder={"File name without extension (Optional)"}
        onChange={(newValue) => {
          setFileName(newValue + fileType.extension);
        }}
      />
      {fileType.simpleContent && (
        <Form.TextArea
          id={"FileContent"}
          title={"File Content"}
          placeholder={"File content (Optional)"}
          onChange={(newValue) => {
            setFileContent(newValue);
          }}
        />
      )}
    </Form>
  );
}
