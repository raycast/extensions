import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  MenuBarExtra,
  open,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import React, { useState } from "react";
import { getLocalStorage, isEmpty, isImage } from "./utils/common-utils";
import { DirectoryInfo, FileInfo, FileType } from "./types/types";
import { parse } from "path";
import { pinFolder } from "./pin-folder";
import { LocalStorageKey, tagDirectoryTypes } from "./utils/constants";
import {
  alertDialog,
  copyLatestFile,
  getFileInfoAndPreview,
  getIsShowDetail,
  localDirectoryWithFiles,
  refreshNumber,
} from "./hooks/hooks";
import { ActionRemoveAllDirectories, ActionsOnFile } from "./components/action-on-files";
import { Preferences } from "./types/preferences";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import { QuickAccessEmptyView } from "./components/quick-access-empty-view";
import { ItemDetail } from "./components/item-detail";
import { copyFileByPath } from "./utils/applescript-utils";

export default function SearchPinnedFolders() {
  const { showOpenFolders, primaryAction } = getPreferenceValues<Preferences>();
  const [refresh, setRefresh] = useState<number>(0);

  const { directoryWithFiles, loading } = localDirectoryWithFiles(refresh, showOpenFolders);

  return (
    <MenuBarExtra
      icon={{ source: { light: "pinned-folders-menu-bar.png", dark: "pinned-folders-menu-bar@dark.png" } }}
      isLoading={loading}
    >
      {directoryWithFiles.map((directory) => (
        <MenuBarExtra.Submenu
          key={directory.directory.id}
          title={directory.directory.name}
          icon={{ fileIcon: directory.directory.path }}
        >
          {directory.files.map((fileValue) => (
            <MenuBarExtra.Item
              key={fileValue.path}
              icon={isImage(parse(fileValue.path).ext) ? { source: fileValue.path } : { fileIcon: fileValue.path }}
              title={fileValue.name}
              tooltip={fileValue.path}
              onAction={async () => {
                switch (primaryAction) {
                  case "Copy": {
                    await showHUD(`${fileValue.name} is copied to clipboard`);
                    await copyFileByPath(fileValue.path);
                    break;
                  }
                  case "Show": {
                    await showInFinder(fileValue.path);
                    break;
                  }
                  case "Open": {
                    await open(fileValue.path);
                    break;
                  }
                }
              }}
            />
          ))}
        </MenuBarExtra.Submenu>
      ))}

      <MenuBarExtra.Item
        title={"Pin Folder"}
        icon={Icon.Pin}
        onAction={async () => {
          await pinFolder(false);
          setRefresh(refreshNumber());
        }}
      />
    </MenuBarExtra>
  );
}
