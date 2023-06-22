import { Action, ActionPanel, Form, Icon, LocalStorage, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { DirectoryInfo, DirectoryType, LocalDirectoryKey } from "./types/directory-info";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { getDirectoryName, isDirectoryOrFile } from "./utils/common-utils";
import { refreshNumber } from "./hooks/hooks";
import path from "path";
import fse from "fs-extra";

export default function AddCommonDirectory(props: { setRefresh: React.Dispatch<React.SetStateAction<number>> }) {
  const setRefresh =
    typeof props.setRefresh == "undefined"
      ? () => {
          return;
        }
      : props.setRefresh;
  const [directoryPath, setDirectoryPath] = useState<string[]>([]);
  const [name, setName] = useState<string>("");
  const [alias, setAlias] = useState<string>("");
  const [pathError, setPathError] = useState<string | undefined>();

  useEffect(() => {
    async function _setName() {
      if (directoryPath.length !== 0) {
        setName(getDirectoryName(directoryPath[0]));
      }
    }

    _setName().then();
  }, [directoryPath]);

  return (
    <Form
      navigationTitle={"Add Common Directory"}
      actions={
        <ActionPanel>
          <Action
            title={"Add Directory"}
            icon={Icon.Plus}
            onAction={async () => {
              if (directoryPath.length === 0) {
                setPathError("The field should't be empty!");
                return;
              }
              await addDirectory(alias, directoryPath[0], setPathError);
              setRefresh(refreshNumber());
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Information"
        text={`Directory added will automatically be available in the Open Common Directory and Send File to Directory commands.`}
      />
      <Form.FilePicker
        id={"filePicker"}
        title={"Folder"}
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        value={directoryPath}
        onChange={(newValue) => {
          setDirectoryPath(newValue);
          setPathError("");
        }}
        error={pathError}
      />
      <Form.TextField id={"alias"} title={"Alias"} placeholder={"Optional"} value={alias} onChange={setAlias} />
      <Form.Description title={"Name"} text={name} />
    </Form>
  );
}

async function addDirectory(
  alias: string,
  directoryPath: string,
  setPathError: Dispatch<SetStateAction<string | undefined>>
) {
  const parsedPath = path.parse(directoryPath);
  const isValid = fse.existsSync(directoryPath);
  if (isValid) {
    const _type = isDirectoryOrFile(directoryPath);
    if (_type === DirectoryType.FILE) {
      setPathError("File path is not supported.");
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
          name: parsedPath.base,
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
        await showHUD(`${parsedPath.name} added`);
        await popToRoot({ clearSearchBar: false });
      }
    }
  } else {
    setPathError("Path is invalid.");
  }
}
