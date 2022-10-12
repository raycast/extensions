import {
  Clipboard,
  getPreferenceValues,
  Icon,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
  showInFinder,
  trash,
} from "@raycast/api";
import React, { useState } from "react";
import { isImage } from "./utils/common-utils";
import { DirectoryWithFileInfo } from "./types/types";
import { parse } from "path";
import { pinFolder } from "./pin-folder";
import { localDirectoryWithFiles, refreshNumber } from "./hooks/hooks";
import { Preferences } from "./types/preferences";
import { copyFileByPath } from "./utils/applescript-utils";

export default function SearchPinnedFolders() {
  const { showOpenFolders, primaryAction } = getPreferenceValues<Preferences>();
  const [refresh, setRefresh] = useState<number>(0);

  const { pinnedDirectoryWithFiles, openDirectoryWithFiles, loading } = localDirectoryWithFiles(
    refresh,
    showOpenFolders
  );

  return (
    <MenuBarExtra
      icon={{ source: { light: "pinned-folders-menu-bar.png", dark: "pinned-folders-menu-bar@dark.png" } }}
      isLoading={loading}
    >
      {pinnedDirectoryWithFiles.length !== 0 && (
        <MenuBarExtra.Section title={"Pinned Folder"}>
          {pinnedDirectoryWithFiles.map((directory) => (
            <FolderMenuBarItem key={directory.directory.id} directory={directory} primaryAction={primaryAction} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Separator />
      {openDirectoryWithFiles.length !== 0 && (
        <MenuBarExtra.Section title={"Open Folder"}>
          {openDirectoryWithFiles.map((directory) => (
            <FolderMenuBarItem key={directory.directory.id} directory={directory} primaryAction={primaryAction} />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={"Pin Folder"}
        icon={Icon.Pin}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={async () => {
          await pinFolder(false);
          setRefresh(refreshNumber());
        }}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={"Preferences"}
        icon={Icon.Gear}
        onAction={() => {
          openCommandPreferences().then();
        }}
        shortcut={{ modifiers: ["cmd"], key: "," }}
      />
    </MenuBarExtra>
  );
}

function FolderMenuBarItem(props: { directory: DirectoryWithFileInfo; primaryAction: string }) {
  const { directory, primaryAction } = props;
  return (
    <MenuBarExtra.Submenu
      key={directory.directory.id}
      title={directory.directory.name}
      icon={{ fileIcon: directory.directory.path }}
    >
      {directory.files.map((fileValue) => (
        <MenuBarExtra.Submenu
          key={fileValue.path}
          icon={isImage(parse(fileValue.path).ext) ? { source: fileValue.path } : { fileIcon: fileValue.path }}
          title={fileValue.name}
        >
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
          <MenuBarExtra.Item
            icon={Icon.Trash}
            title={"Remove"}
            onAction={async () => {
              await trash(fileValue.path);
            }}
          />
        </MenuBarExtra.Submenu>
      ))}
    </MenuBarExtra.Submenu>
  );
}
