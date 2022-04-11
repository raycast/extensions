import { Action, ActionPanel, Icon, Form, showToast, Toast, environment } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { checkDirectoryExists, checkIsFile, getChooseFile, getFileInfo, getSelectedFile } from "./utils/utils";
import fs from "fs";

export default function AddFileTemplate(props: {
  updateListUseState: [number[], React.Dispatch<React.SetStateAction<number[]>>];
}) {
  const [updateList, setUpdateList] =
    typeof props.updateListUseState == "undefined" ? useState<number[]>([0]) : props.updateListUseState;
  const [path, setPath] = useState<string>("");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    async function _initRunAppleScript() {
      const _path = await fetchFilePath();
      setPath(_path);
      setName(getFileInfo(_path).nameWithoutExtension);
    }

    _initRunAppleScript().then();
  }, []);

  return (
    <Form
      navigationTitle={"Add File Template"}
      actions={
        <ActionPanel>
          <Action
            title={"Add File Template"}
            icon={Icon.TextDocument}
            onAction={async () => {
              await addFileTemplate(name, path);
              const _updateList = [...updateList];
              _updateList[0]++;
              setUpdateList(_updateList);
            }}
          />

          <ActionPanel.Section title="Fill File Path">
            <Action
              title={"Fetch File"}
              icon={Icon.TwoArrowsClockwise}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={async () => {
                const _path = await fetchFilePath();
                setPath(_path);
                setName(getFileInfo(_path).nameWithoutExtension);
              }}
            />
            <Action
              title={"Select File"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => {
                getChooseFile().then((path) => {
                  setPath(path);
                  setName(getFileInfo(path).nameWithoutExtension);
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea id={"path"} title={"Path"} placeholder={"/xxx/xxx"} value={path} onChange={setPath} />
      <Form.TextField
        id={"name"}
        title={"Name"}
        placeholder={"File name without extension(Optional)"}
        value={getFileInfo(path).nameWithoutExtension}
        onChange={setName}
      />
      <Form.Description title={"Extension"} text={getFileInfo(path).extension} />
    </Form>
  );
}

const fetchFilePath = async () => {
  await showToast(Toast.Style.Animated, "Fetching selected file...");
  const _finderItems = await getSelectedFile();
  if (_finderItems.length > 0) {
    await showToast(Toast.Style.Success, "Fetch path success!");
    return _finderItems[0];
  } else {
    await showToast(Toast.Style.Failure, "Fetch nothing.", "Please select a file or input manually.");
    return "";
  }
};
const addFileTemplate = async (name: string, path: string) => {
  if (checkDirectoryExists(path)) {
    if (checkIsFile(path)) {
      await showToast(Toast.Style.Animated, "Adding template...");
      const templateFolderPath = environment.supportPath + "/templates";
      const desPath = templateFolderPath + "/" + name + "." + getFileInfo(path).extension;
      if (checkDirectoryExists(desPath)) {
        await showToast(Toast.Style.Failure, "File already exists.\nPlease rename.");
        return;
      }
      if (checkDirectoryExists(templateFolderPath)) {
        fs.copyFileSync(path, desPath);
      } else {
        fs.mkdir(templateFolderPath, function (error) {
          if (error) {
            showToast(Toast.Style.Success, String(error) + ".");
            return false;
          }
          fs.copyFileSync(path, desPath);
        });
      }
      await showToast(Toast.Style.Success, "Add template success!");
    } else {
      await showToast(Toast.Style.Failure, "Folder path not supported.");
    }
  } else {
    await showToast(Toast.Style.Failure, "Path is invalid.");
  }
};
