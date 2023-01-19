import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
  trash,
  useNavigation,
} from "@raycast/api";
import { alertDialog, refreshNumber } from "../hooks/hooks";
import { LocalStorageKey } from "../utils/constants";
import React from "react";
import { copyFileByPath } from "../utils/applescript-utils";
import { upRank } from "../search-pins";
import { isDirectory } from "../utils/common-utils";
import { FolderPageList } from "./folder-page-list";
import { Preferences } from "../types/preferences";
import { Layout } from "../types/types";
import { FolderPageGrid } from "./folder-page-grid";

export function ActionRemoveAllDirectories(props: { setRefresh: React.Dispatch<React.SetStateAction<number>> }) {
  const { setRefresh } = props;
  return (
    <Action
      icon={Icon.ExclamationMark}
      title={`Unpin All`}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      onAction={async () => {
        await alertDialog(
          Icon.ExclamationMark,
          "Unpin All",
          "Are you sure you  want to unpin all files and folders?",
          "Unpin All",
          async () => {
            await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify([]));
            setRefresh(refreshNumber);
            await showToast(Toast.Style.Success, "Success!", `All files and folders are unpinned.`);
          }
        );
      }}
    />
  );
}

export function ActionsOnFile(props: {
  isTopFolder: boolean;
  primaryAction: string;
  name: string;
  path: string;
  index: number;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { pop } = useNavigation();
  const { layout } = getPreferenceValues<Preferences>();
  const { isTopFolder, primaryAction, name, path, index, setRefresh } = props;
  return (
    <>
      <PrimaryActionOnFile
        isTopFolder={isTopFolder}
        primaryAction={primaryAction}
        name={name}
        path={path}
        index={index}
        setRefresh={setRefresh}
      />

      <ActionPanel.Section>
        <Action.OpenWith shortcut={{ modifiers: ["cmd"], key: "o" }} path={path} />
        <Action.ShowInFinder
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          path={path}
          onShow={async () => await upRank(index, setRefresh)}
        />
        <Action.ToggleQuickLook title={"Quick Look"} shortcut={{ modifiers: ["cmd"], key: "y" }} />
      </ActionPanel.Section>
      {!isTopFolder && (
        <Action
          icon={Icon.ChevronUp}
          title={"Enclosing Folder"}
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
          onAction={pop}
        />
      )}
      {isDirectory(path) && (
        <Action.Push
          icon={Icon.ChevronDown}
          title={"Enter Folder"}
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
          target={
            layout === Layout.LIST ? (
              <FolderPageList folderName={name} folderPath={path} primaryAction={primaryAction} />
            ) : (
              <FolderPageGrid folderName={name} folderPath={path} primaryAction={primaryAction} />
            )
          }
        />
      )}
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title={"Copy Name"}
          content={name}
          shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
        />
        <Action.CopyToClipboard
          title={"Copy Path"}
          content={path}
          shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          icon={Icon.Trash}
          title={"Move to trash"}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            await alertDialog(
              Icon.Trash,
              "Move to Trash",
              `Are you sure you want to move ${name} to the trash?`,
              "Move to trash",
              async () => {
                await trash(path);
                setRefresh(refreshNumber);
                await showToast(Toast.Style.Success, "Success!", `${name} is moved to the trash.`);
              }
            );
          }}
        />
      </ActionPanel.Section>
    </>
  );
}

export function PrimaryActionOnFile(props: {
  isTopFolder: boolean;
  primaryAction: string;
  name: string;
  path: string;
  index: number;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { isTopFolder, primaryAction, name, path, index, setRefresh } = props;
  if (primaryAction === "Copy") {
    return (
      <>
        <Action
          icon={Icon.CopyClipboard}
          title={"Copy"}
          onAction={async () => {
            await showHUD(`${name} is copied to clipboard`);
            await copyFileByPath(path);
            isTopFolder && (await upRank(index, setRefresh));
          }}
        />
        <Action.Open
          title={"Open"}
          target={path}
          onOpen={async () => isTopFolder && (await upRank(index, setRefresh))}
        />
        <PasteActionOnFile isTopFolder={isTopFolder} index={index} path={path} setRefresh={setRefresh} />
      </>
    );
  } else {
    return (
      <>
        <Action.Open
          title={"Open"}
          target={path}
          onOpen={async () => isTopFolder && (await upRank(index, setRefresh))}
        />
        <Action
          icon={Icon.CopyClipboard}
          title={"Copy"}
          onAction={async () => {
            await copyFileByPath(path);
            isTopFolder && (await upRank(index, setRefresh));
          }}
        />
        <PasteActionOnFile isTopFolder={isTopFolder} index={index} path={path} setRefresh={setRefresh} />
      </>
    );
  }
}

export function PasteActionOnFile(props: {
  isTopFolder: boolean;
  path: string;
  index: number;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { isTopFolder, path, index, setRefresh } = props;

  return (
    <Action
      icon={Icon.AppWindow}
      title={"Paste"}
      shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
      onAction={async () => {
        await closeMainWindow();
        await Clipboard.paste({ file: path });
        isTopFolder && (await upRank(index, setRefresh));
      }}
    />
  );
}
