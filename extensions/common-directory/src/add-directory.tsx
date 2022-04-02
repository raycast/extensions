import { Action, ActionPanel, Form, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { DirectoryInfo, DirectoryType } from "./directory-info";
import React, { useEffect, useState } from "react";
import { checkPathValid, getDirectoryName, getFinderPath, getSelectedDirectory, isDirectoryOrFile } from "./utils";

export default function AddDirectory(props: {
  updateListUseState: [number[], React.Dispatch<React.SetStateAction<number[]>>];
}) {
  const [updateList, setUpdateList] =
    typeof props.updateListUseState == "undefined" ? useState<number[]>([0]) : props.updateListUseState;
  const [path, setPath] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [alias, setAlias] = useState<string>("");

  useEffect(() => {
    async function _fetchPath() {
      await fetchDirectoryPath(setPath);
    }

    _fetchPath().then();
  }, []);

  useEffect(() => {
    async function _SetName() {
      setName(getDirectoryName(path));
    }

    _SetName().then();
  }, [path]);

  return (
    <Form
      navigationTitle={"Add Directory"}
      actions={
        <ActionPanel>
          <Action
            title={"Add Directory"}
            icon={Icon.Download}
            onAction={async () => {
              await addDirectory(alias, path);
              const _updateList = [...updateList];
              _updateList[0]++;
              setUpdateList(_updateList);
            }}
          />
          <Action
            title={"Fetch Directory"}
            icon={Icon.TwoArrowsClockwise}
            onAction={async () => {
              await fetchDirectoryPath(setPath);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id={"path"} title={"Path"} placeholder={"/xxx/xxx"} value={path} onChange={setPath} />
      <Form.TextField id={"alias"} title={"Alias"} placeholder={"Optional"} value={alias} onChange={setAlias} />
      <Form.Description title={"Name"} text={name} />
    </Form>
  );
}

async function fetchDirectoryPath(setPath: React.Dispatch<React.SetStateAction<string>>) {
  await showToast(Toast.Style.Animated, "Fetching path...");
  const selectedDirectory = await getSelectedDirectory();
  setPath(selectedDirectory.length === 0 ? await getFinderPath() : selectedDirectory[0].slice(0, -1));
  await showToast(Toast.Style.Success, "Fetch path success!");
}

async function addDirectory(alias: string, path: string) {
  const isValid = await checkPathValid(path);
  if (isValid) {
    const _type = isDirectoryOrFile(path);
    if (_type === DirectoryType.FILE) {
      await showToast(Toast.Style.Failure, `File path not supported.`);
    } else {
      const _localStorage = await LocalStorage.getItem(_type);
      const _commonDirectory: DirectoryInfo[] = typeof _localStorage == "string" ? JSON.parse(_localStorage) : [];
      //check duplicate
      let duplicatePath = false;
      _commonDirectory.forEach((value) => {
        if (value.path === path) {
          duplicatePath = true;
          return;
        }
      });
      if (duplicatePath) {
        await showToast(Toast.Style.Failure, "Directory already exists.");
      } else {
        _commonDirectory.push({
          id: _type + "_" + new Date().getTime(),
          alias: alias,
          name: getDirectoryName(path),
          path: path,
          valid: true,
          type: _type,
          rank: 1,
        });
        await LocalStorage.setItem(_type, JSON.stringify(_commonDirectory));
        await showToast(Toast.Style.Success, `Add ${_type} success!`);
      }
    }
  } else {
    await showToast(Toast.Style.Success, "Path is invalid.");
  }
}
