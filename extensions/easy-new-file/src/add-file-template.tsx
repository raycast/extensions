import { Action, ActionPanel, environment, Form, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { checkIsFile, getSelectedFile, isEmpty } from "./utils/common-utils";
import fse from "fs-extra";
import { parse } from "path";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";

export default function AddFileTemplate(props: { setRefresh: React.Dispatch<React.SetStateAction<number>> }) {
  const setRefresh =
    typeof props.setRefresh == "undefined"
      ? () => {
          return;
        }
      : props.setRefresh;
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [name, setName] = useState<string>("");
  const [pathError, setPathError] = useState<string | undefined>();

  useEffect(() => {
    async function _fetchFilePath() {
      const _path = await fetchFilePath(true);
      if (!isEmpty(_path)) {
        setFilePaths(new Array(_path));
        setName(parse(_path).name);
      }
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
            icon={Icon.NewDocument}
            onAction={async () => {
              if (filePaths.length === 0) {
                setPathError("Select a file first!");
                return;
              }
              let finalName = name;
              if (isEmpty(name)) {
                finalName = parse(filePaths[0]).name;
              }
              await addFileTemplate(finalName, filePaths[0], setPathError);
              setRefresh(Date.now());
            }}
          />

          <ActionPanel.Section>
            <Action
              title={"Fetch File Path"}
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={async () => {
                const _path = await fetchFilePath();
                if (!isEmpty(_path)) {
                  setFilePaths(new Array(_path));
                  setName(parse(_path).name);
                }
              }}
            />
          </ActionPanel.Section>
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Tips"
        text={`Templates added will automatically be available in the New File Here command.`}
      />
      <Form.FilePicker
        id={"file"}
        title={"File"}
        value={filePaths}
        error={pathError}
        allowMultipleSelection={false}
        showHiddenFiles={false}
        canChooseDirectories={false}
        onChange={(newValue) => {
          setFilePaths(newValue);
          setName(parse(newValue[0]).name);
          if (newValue.length > 0) {
            setPathError(undefined);
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setPathError("Select a file first!");
          } else {
            setPathError(undefined);
          }
        }}
        info={"If you select a file before opening this command, its filePaths is automatically added."}
      />

      {filePaths.length > 0 && <Form.Description title={""} text={`${filePaths.length > 0 ? filePaths[0] : ""}`} />}

      <Form.TextField
        id={"name"}
        title={"Name"}
        placeholder={"File name without extension(Optional)"}
        value={name}
        onChange={setName}
      />
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
      await showToast(Toast.Style.Failure, "Fetch nothing.", "Please select a file.");
    }
    return "";
  }
};

const addFileTemplate = async (
  name: string,
  path: string,
  setPathError: Dispatch<SetStateAction<string | undefined>>,
) => {
  if (fse.existsSync(path)) {
    if (checkIsFile(path)) {
      const templateFolderPath = environment.supportPath + "/templates";
      const desPath = templateFolderPath + "/" + name + parse(path).ext;
      if (fse.existsSync(desPath)) {
        setPathError("File already exists! Please rename!");
        return;
      }

      fse.ensureDirSync(templateFolderPath);
      fse.copyFileSync(path, desPath);

      await showHUD("📃 Template added");
      await popToRoot({ clearSearchBar: false });
    } else {
      setPathError("Folder path is not supported!");
    }
  } else {
    setPathError("Path is invalid!");
  }
};
