import { Action, ActionPanel, environment, Form, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { checkIsFile, getChooseFile, getSelectedFile } from "./utils/common-utils";
import fse from "fs-extra";
import { refreshNumber } from "./hooks/hooks";
import { parse } from "path";

export default function AddFileTemplate(props: { setRefresh: React.Dispatch<React.SetStateAction<number>> }) {
  const setRefresh =
    typeof props.setRefresh == "undefined"
      ? () => {
          return;
        }
      : props.setRefresh;
  const [path, setPath] = useState<string>("");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    async function _fetchFilePath() {
      const _path = await fetchFilePath(true);
      setPath(_path);
      setName(parse(_path).name);
    }

    _fetchFilePath().then();
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
              setRefresh(refreshNumber());
            }}
          />

          <ActionPanel.Section title="File Path Action">
            <Action
              title={"Fetch File Path"}
              icon={Icon.TwoArrowsClockwise}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={async () => {
                const _path = await fetchFilePath();
                setPath(_path);
                setName(parse(_path).name);
              }}
            />
            <Action
              title={"Choose File Path"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
              onAction={() => {
                getChooseFile().then((path) => {
                  setPath(path);
                  setName(parse(path).name);
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="Information"
        text={`Templates added will automatically be available in the New File Here command.`}
      />
      <Form.TextArea
        id={"path"}
        title={"Path"}
        placeholder={"/xxx/xxx"}
        value={path}
        onChange={setPath}
        info={
          "Insert the full path of the file used for the template. If you select a file before opening this command, its path is automatically added."
        }
      />
      <Form.TextField
        id={"name"}
        title={"Name"}
        placeholder={"File name without extension(Optional)"}
        value={parse(path).name}
        onChange={setName}
      />
      <Form.Description title={"Extension"} text={parse(path).name} />
    </Form>
  );
}

const fetchFilePath = async (enterCommand = false) => {
  if (!enterCommand) {
    await showToast(Toast.Style.Animated, "Fetching selected file...");
  }
  const _finderItems = await getSelectedFile();
  if (_finderItems.length > 0) {
    await showToast(Toast.Style.Success, "Fetch path success!");
    return _finderItems[0];
  } else {
    if (!enterCommand) {
      await showToast(Toast.Style.Failure, "Fetch nothing.", "Please select a file or input manually.");
    }
    return "";
  }
};

const addFileTemplate = async (name: string, path: string) => {
  if (fse.existsSync(path)) {
    if (checkIsFile(path)) {
      const templateFolderPath = environment.supportPath + "/templates";
      const desPath = templateFolderPath + "/" + name + parse(path).ext;
      if (fse.existsSync(desPath)) {
        await showToast(Toast.Style.Failure, "File already exists.\nPlease rename.");
        return;
      }
      if (fse.existsSync(templateFolderPath)) {
        fse.copyFileSync(path, desPath);
      } else {
        fse.mkdir(templateFolderPath, function (error) {
          if (error) {
            showToast(Toast.Style.Failure, String(error) + ".");
            return false;
          }
          fse.copyFileSync(path, desPath);
        });
      }
      await showHUD("Template added");
      await popToRoot({ clearSearchBar: false });
    } else {
      await showToast(Toast.Style.Failure, "Folder path not supported.");
    }
  } else {
    await showToast(Toast.Style.Failure, "Path is invalid.");
  }
};
