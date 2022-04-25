import { Action, Icon, LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import { alertDialog, refreshNumber } from "../hooks/hooks";
import { LocalStorageKey } from "./constants";
import React from "react";
import { FileInfo } from "./directory-info";
import { copyFileByPath } from "./applescript-utils";
import { isEmpty } from "./common-utils";
import { upRank } from "../search-pinned-directories";

export function ActionRemoveAllDirectories(props: { setRefresh: React.Dispatch<React.SetStateAction<number>> }) {
  const { setRefresh } = props;
  return (
    <Action
      icon={Icon.ExclamationMark}
      title={`Remove All Directory`}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      onAction={async () => {
        await alertDialog(
          Icon.ExclamationMark,
          "Remove All Directories",
          "Are you sure you  want to remove all directories?",
          "Remove All",
          async () => {
            await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify([]));
            setRefresh(refreshNumber);
            await showToast(Toast.Style.Success, "Success!", `All directories are removed.`);
          }
        );
      }}
    />
  );
}

export function PrimaryActionOnFile(props: {
  primaryAction: string;
  fileInfo: FileInfo;
  index: number;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { primaryAction, fileInfo, index, setRefresh } = props;
  if (primaryAction === "Copy") {
    return (
      <>
        <Action
          icon={Icon.Clipboard}
          title={"Copy"}
          onAction={async () => {
            const copyResult = await copyFileByPath(fileInfo.path);
            if (isEmpty(copyResult)) {
              await showHUD(`${fileInfo.name} is copied to clipboard`);
            } else {
              await showHUD(copyResult);
            }
            await upRank(index, setRefresh);
          }}
        />
        <Action.Open title={"Open"} target={fileInfo.path} onOpen={async () => await upRank(index, setRefresh)} />
      </>
    );
  } else {
    return (
      <>
        <Action.Open title={"Open"} target={fileInfo.path} onOpen={async () => await upRank(index, setRefresh)} />
        <Action
          icon={Icon.Clipboard}
          title={"Copy"}
          onAction={async () => {
            const copyResult = await copyFileByPath(fileInfo.path);
            if (isEmpty(copyResult)) {
              await showHUD(`${fileInfo.name} is copied to clipboard`);
            } else {
              await showHUD(copyResult);
            }
            await upRank(index, setRefresh);
          }}
        />
      </>
    );
  }
}
