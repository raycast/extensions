import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LocalStorage,
  open,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { DirectoryInfo, DirectoryType, LocalDirectoryKey } from "./types/directory-info";
import React, { useEffect, useState } from "react";
import { getDirectoryName, getSelectedDirectory, isDirectoryOrFile } from "./utils/common-utils";
import { refreshNumber } from "./hooks/hooks";
import path from "path";
import fse from "fs-extra";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import { getChooseFolder, getFinderInsertLocation } from "./utils/applescript-utils";

export default function AddCommonDirectory(props: { setRefresh: React.Dispatch<React.SetStateAction<number>> }) {
  const setRefresh =
    typeof props.setRefresh == "undefined"
      ? () => {
          return;
        }
      : props.setRefresh;
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
    async function _setName() {
      setName(getDirectoryName(path));
    }
    _setName().then();
  }, [path]);

  return (
    <Form
      navigationTitle={"Add Common Directory"}
      actions={
        <ActionPanel>
          <Action
            title={"Add Directory"}
            icon={Icon.Plus}
            onAction={async () => {
              await addDirectory(alias, path);
              setRefresh(refreshNumber());
            }}
          />

          <ActionPanel.Section title="Fill Directory">
            <Action
              title={"Fetch Directory"}
              icon={Icon.TwoArrowsClockwise}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={async () => {
                await fetchDirectoryPath(setPath);
              }}
            />
            <Action
              title={"Choose Directory"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["shift", "ctrl"], key: "c" }}
              onAction={() => {
                getChooseFolder().then((path) => {
                  open("raycast://").then();
                  setPath(path);
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="Information"
        text={`Directory added will automatically be available in the Open Common Directory and Send File to Directory commands.`}
      />
      <Form.TextArea
        id={"path"}
        title={"Path"}
        placeholder={"/xxx/xxx"}
        value={path}
        onChange={setPath}
        info={
          "Insert the full path of the directory. If you select a directory before opening this command, its path is automatically added."
        }
      />
      <Form.TextField id={"alias"} title={"Alias"} placeholder={"Optional"} value={alias} onChange={setAlias} />
      <Form.Description title={"Name"} text={name} />
    </Form>
  );
}

async function fetchDirectoryPath(setPath: React.Dispatch<React.SetStateAction<string>>) {
  await showToast(Toast.Style.Animated, "Fetching path...");
  const selectedDirectory = await getSelectedDirectory();
  setPath(selectedDirectory.length === 0 ? await getFinderInsertLocation() : selectedDirectory[0].slice(0, -1));
  await showToast(Toast.Style.Success, "Fetched successfully!");
}

async function addDirectory(alias: string, directoryPath: string) {
  const parsedPath = path.parse(directoryPath);
  const isValid = fse.existsSync(directoryPath);
  if (isValid) {
    const _type = isDirectoryOrFile(directoryPath);
    if (_type === DirectoryType.FILE) {
      await showToast(Toast.Style.Failure, `File path is not supported.`);
    } else {
      const _localStorageOpen = await LocalStorage.getItem(LocalDirectoryKey.OPEN_COMMON_DIRECTORY);
      const _localStorageSend = await LocalStorage.getItem(LocalDirectoryKey.SEND_COMMON_DIRECTORY);
      const _OpenCommonDirectory: DirectoryInfo[] =
        typeof _localStorageOpen == "string" ? JSON.parse(_localStorageOpen) : [];
      const _SendCommonDirectory: DirectoryInfo[] =
        typeof _localStorageSend == "string" ? JSON.parse(_localStorageSend) : [];
      //check duplicate
      let duplicatePath = false;
      _OpenCommonDirectory.forEach((value) => {
        if (value.path === parsedPath.dir + "/" + parsedPath.base) {
          duplicatePath = true;
          return;
        }
      });
      if (duplicatePath) {
        await showToast(Toast.Style.Failure, "Directory already exists.");
      } else {
        const newItem = {
          id: _type + "_" + new Date().getTime(),
          alias: alias,
          name: getDirectoryName(directoryPath),
          path: parsedPath.dir + "/" + parsedPath.base,
          valid: true,
          type: _type,
          rank: 1,
          rankSendFile: 1,
          isCommon: true,
          date: new Date().getTime(),
        };
        _OpenCommonDirectory.push(newItem);
        _SendCommonDirectory.push(newItem);
        await LocalStorage.setItem(LocalDirectoryKey.OPEN_COMMON_DIRECTORY, JSON.stringify(_OpenCommonDirectory));
        await LocalStorage.setItem(LocalDirectoryKey.SEND_COMMON_DIRECTORY, JSON.stringify(_SendCommonDirectory));
        await showHUD(`Successfully added ${parsedPath.name}`);
        await popToRoot({ clearSearchBar: false });
      }
    }
  } else {
    await showToast(Toast.Style.Failure, "Path is invalid.");
  }
}
