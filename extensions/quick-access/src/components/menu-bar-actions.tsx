import React from "react";
import { Application, Clipboard, Icon, MenuBarExtra, open, showHUD, showInFinder } from "@raycast/api";
import { copyFileByPath } from "../utils/applescript-utils";
import { DirectoryWithFileInfo, FileInfo } from "../types/types";

export function MenuBarActionsOnFile(props: {
  frontmostApp: Application | undefined;
  primaryAction: string;
  fileValue: FileInfo;
}) {
  const { frontmostApp, primaryAction, fileValue } = props;
  return (
    <>
      <MenuBarExtra.Item
        icon={
          primaryAction === "Copy" ? Icon.CopyClipboard : frontmostApp ? { fileIcon: frontmostApp.path } : Icon.Desktop
        }
        title={primaryAction === "Copy" ? "Copy" : "Paste"}
        onAction={async () => {
          if (primaryAction === "Copy") {
            await showHUD(`${fileValue.name} is copied to clipboard`);
            await copyFileByPath(fileValue.path);
          } else {
            await Clipboard.paste({ file: fileValue.path });
          }
        }}
      />
      <MenuBarExtra.Item
        icon={
          primaryAction === "Copy"
            ? frontmostApp
              ? { fileIcon: frontmostApp.path }
              : Icon.Desktop
            : Icon.CopyClipboard
        }
        title={primaryAction === "Copy" ? "Paste" : "Copy"}
        onAction={async () => {
          if (primaryAction === "Copy") {
            await Clipboard.paste({ file: fileValue.path });
          } else {
            await showHUD(`${fileValue.name} is copied to clipboard`);
            await copyFileByPath(fileValue.path);
          }
        }}
      />
      <MenuBarExtra.Item
        icon={Icon.Finder}
        title={"Open"}
        onAction={async () => {
          await open(fileValue.path);
        }}
      />
      <MenuBarExtra.Item
        icon={Icon.Desktop}
        title={"Show"}
        onAction={async () => {
          await showInFinder(fileValue.path);
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
