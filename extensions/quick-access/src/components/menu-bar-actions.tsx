import React from "react";
import { Clipboard, Icon, MenuBarExtra, open, showHUD, showInFinder, trash } from "@raycast/api";
import { copyFileByPath } from "../utils/applescript-utils";
import { DirectoryWithFileInfo, FileInfo } from "../types/types";

export function MenuBarActionsOnFile(props: { primaryAction: string; fileValue: FileInfo }) {
  const { primaryAction, fileValue } = props;
  return (
    <>
      <MenuBarExtra.Item
        icon={primaryAction === "Copy" ? Icon.CopyClipboard : Icon.Finder}
        title={primaryAction === "Copy" ? "Copy" : "Open"}
        onAction={async () => {
          if (primaryAction === "Copy") {
            await showHUD(`${fileValue.name} is copied to clipboard`);
            await copyFileByPath(fileValue.path);
          } else {
            await open(fileValue.path);
          }
        }}
      />
      <MenuBarExtra.Item
        icon={primaryAction === "Open" ? Icon.CopyClipboard : Icon.Finder}
        title={primaryAction === "Open" ? "Copy" : "Open"}
        onAction={async () => {
          if (primaryAction === "Open") {
            await showHUD(`${fileValue.name} is copied to clipboard`);
            await copyFileByPath(fileValue.path);
          } else {
            await open(fileValue.path);
          }
        }}
      />
      <MenuBarExtra.Item
        icon={Icon.AppWindow}
        title={"Paste"}
        onAction={async () => {
          await Clipboard.paste({ file: fileValue.path });
        }}
      />
      <MenuBarExtra.Item
        icon={Icon.Desktop}
        title={"Show"}
        onAction={async () => {
          await showInFinder(fileValue.path);
        }}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        icon={Icon.Trash}
        title={"Delete"}
        onAction={async () => {
          await showHUD(`${fileValue.name} is removed to trash`);
          await trash(fileValue.path);
        }}
      />
    </>
  );
}

export function MenuBarActionsOnFolder(props: { directoryWithFileInfo: DirectoryWithFileInfo }) {
  const { directoryWithFileInfo } = props;
  return (
    <>
      <MenuBarExtra.Item
        icon={Icon.Finder}
        title={"Open"}
        onAction={async () => {
          await open(directoryWithFileInfo.directory.path);
        }}
      />
      <MenuBarExtra.Item
        icon={Icon.Desktop}
        title={"Show"}
        onAction={async () => {
          await showInFinder(directoryWithFileInfo.directory.path);
        }}
      />
    </>
  );
}
