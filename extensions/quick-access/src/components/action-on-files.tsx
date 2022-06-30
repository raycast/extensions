import { Action, ActionPanel, Icon, LocalStorage, showHUD, showToast, Toast, trash, useNavigation } from "@raycast/api";
import { alertDialog, refreshNumber } from "../hooks/hooks";
import { LocalStorageKey } from "../utils/constants";
import React from "react";
import { copyFileByPath } from "../utils/applescript-utils";
import { upRank } from "../search-pinned-directories";
import { isDirectory } from "../utils/common-utils";
import { FolderPage } from "./folder-page";

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

export function ActionsOnFile(props: {
  isTopFolder: boolean;
  primaryAction: string;
  name: string;
  path: string;
  index: number;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { pop } = useNavigation();
  const { isTopFolder, primaryAction, name, path, index, setRefresh } = props;
  return (
    <>
      <PrimaryActionOnFile
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
          target={<FolderPage folderName={name} folderPath={path} primaryAction={primaryAction} />}
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
  primaryAction: string;
  name: string;
  path: string;
  index: number;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { primaryAction, name, path, index, setRefresh } = props;
  if (primaryAction === "Copy") {
    return (
      <>
        <Action
          icon={Icon.Clipboard}
          title={"Copy"}
          onAction={async () => {
            await showHUD(`${name} is copied to clipboard`);
            await copyFileByPath(path);
            await upRank(index, setRefresh);
          }}
        />
        <Action.Open title={"Open"} target={path} onOpen={async () => await upRank(index, setRefresh)} />
      </>
    );
  } else {
    return (
      <>
        <Action.Open title={"Open"} target={path} onOpen={async () => await upRank(index, setRefresh)} />
        <Action
          icon={Icon.Clipboard}
          title={"Copy"}
          onAction={async () => {
            await showHUD(`${name} is copied to clipboard`);
            await copyFileByPath(path);
            await upRank(index, setRefresh);
          }}
        />
      </>
    );
  }
}
