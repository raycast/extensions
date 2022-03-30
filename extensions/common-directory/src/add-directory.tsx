import { Action, ActionPanel, Form, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { DirectoryInfo, DirectoryType, folderIcons } from "./directory-info";
import React, { useEffect, useState } from "react";
import { checkPathValid, getDirectoryName, getFinderPath, isDirectoryOrFile } from "./utils";

export default function AddDirectory(props: {
  updateListUseState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
}) {
  const [updateList, setUpdateList] =
    typeof props.updateListUseState == "undefined" ? useState<boolean>(false) : props.updateListUseState;
  const [path, setPath] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [alias, setAlias] = useState<string>("");
  const [icon, setIcon] = useState<string>("");

  useEffect(() => {
    async function _fetchPath() {
      await showToast(Toast.Style.Animated, "Fetching Path");
      setPath(await getFinderPath());
      await showToast(Toast.Style.Success, "Fetch Path Success");
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
              await addDirectory(alias, path, icon);
              setUpdateList(!updateList);
            }}
          />
          <Action
            title={"Fetch Directory"}
            icon={Icon.TwoArrowsClockwise}
            onAction={async () => {
              await showToast(Toast.Style.Animated, "Fetching Path");
              setPath(await getFinderPath());
              await showToast(Toast.Style.Success, "Fetch Path Success");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id={"path"} title={"Path"} placeholder={"/xxx/xxx"} value={path} onChange={setPath} />
      <Form.Dropdown id={"icon"} title={"Icon"} onChange={setIcon}>
        {folderIcons.map((folderIcon) => {
          return (
            <Form.Dropdown.Item
              key={folderIcon.value}
              icon={{ source: folderIcon.value }}
              title={folderIcon.title}
              value={folderIcon.value}
            />
          );
        })}
      </Form.Dropdown>
      <Form.TextField id={"alias"} title={"Alias"} placeholder={"Optional"} value={alias} onChange={setAlias} />
      <Form.Description title={"Name"} text={name} />
    </Form>
  );
}

async function addDirectory(alias: string, path: string, icon: string) {
  const isValid = await checkPathValid(path);
  if (isValid) {
    const _type = isDirectoryOrFile(path);
    if (_type === DirectoryType.FILE) {
      await showToast(Toast.Style.Failure, `File Path Not Supported`);
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
        await showToast(Toast.Style.Failure, "Directory Already Exists");
      } else {
        _commonDirectory.push({
          id: _type + "_" + new Date().getTime(),
          alias: alias,
          name: getDirectoryName(path),
          icon: icon,
          path: path,
          valid: true,
          type: _type,
          rank: 1,
        });
        await LocalStorage.setItem(_type, JSON.stringify(_commonDirectory));
        await showToast(Toast.Style.Success, `Add ${_type} Success`);
      }
    }
  } else {
    await showToast(Toast.Style.Success, "Path is Invalid");
  }
}
