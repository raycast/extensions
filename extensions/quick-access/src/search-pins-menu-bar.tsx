import { getPreferenceValues, Icon, LocalStorage, MenuBarExtra, openCommandPreferences, showHUD } from "@raycast/api";
import React from "react";
import { directory2File, getLocalStorage, isEmpty, isImage } from "./utils/common-utils";
import { DirectoryType, DirectoryWithFileInfo } from "./types/types";
import { parse } from "path";
import { pinFiles } from "./pin";
import { localDirectoryWithFiles } from "./hooks/hooks";
import { Preferences } from "./types/preferences";
import { MenuBarActionsOnFile, MenuBarActionsOnFolder } from "./components/menu-bar-actions";
import { LocalStorageKey } from "./utils/constants";

export default function SearchPinnedFolders() {
  const { showOpenFolders, primaryAction } = getPreferenceValues<Preferences>();

  const { pinnedDirectoryWithFiles, openDirectoryWithFiles, loading } = localDirectoryWithFiles(0, showOpenFolders);

  return (
    <MenuBarExtra
      icon={{
        source: {
          light: "pinned-folders-menu-bar.png",
          dark: "pinned-folders-menu-bar@dark.png",
        },
      }}
      tooltip={"Quick Access"}
      isLoading={loading}
    >
      {pinnedDirectoryWithFiles.length !== 0 && (
        <MenuBarExtra.Section title={"Pins"}>
          {pinnedDirectoryWithFiles.map((directory, index) => (
            <FolderMenuBarItem
              key={directory.directory.id + index}
              directory={directory}
              primaryAction={primaryAction}
              directoryIndex={index}
              hasUnPin={true}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Separator />
      {openDirectoryWithFiles.length !== 0 && (
        <MenuBarExtra.Section title={"Open Folders"}>
          {openDirectoryWithFiles.map((directory, index) => (
            <FolderMenuBarItem
              key={directory.directory.id + index}
              directory={directory}
              primaryAction={primaryAction}
              directoryIndex={index}
              hasUnPin={false}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={"Pin"}
        icon={Icon.Pin}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={async () => {
          await pinFiles();
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

function FolderMenuBarItem(props: {
  directory: DirectoryWithFileInfo;
  primaryAction: string;
  directoryIndex: number;
  hasUnPin: boolean;
}) {
  const { directory, primaryAction, directoryIndex, hasUnPin } = props;
  return (
    <MenuBarExtra.Submenu
      key={directory.directory.id + directoryIndex}
      title={directory.directory.name}
      icon={
        isImage(parse(directory.directory.path).ext)
          ? { source: directory.directory.path }
          : { fileIcon: directory.directory.path }
      }
    >
      {directory.directory.type === DirectoryType.FOLDER ? (
        <MenuBarActionsOnFolder directoryWithFileInfo={directory} />
      ) : (
        <MenuBarActionsOnFile primaryAction={primaryAction} fileValue={directory2File(directory.directory)} />
      )}
      <MenuBarExtra.Separator />
      {directory.files.map((fileValue, index) => (
        <MenuBarExtra.Submenu
          key={fileValue.path + index}
          icon={isImage(parse(fileValue.path).ext) ? { source: fileValue.path } : { fileIcon: fileValue.path }}
          title={fileValue.name}
        >
          <MenuBarActionsOnFile primaryAction={primaryAction} fileValue={fileValue} />
        </MenuBarExtra.Submenu>
      ))}
      {hasUnPin ? (
        <>
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title={"Unpin"}
            icon={Icon.PinDisabled}
            onAction={async () => {
              const localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
              const _localDirectory = isEmpty(localstorage) ? [] : JSON.parse(localstorage);
              _localDirectory.splice(directoryIndex, 1);
              await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify(_localDirectory));
              // setRefresh(refreshNumber());
              await showHUD(`${directory.directory.name} is unpinned`);
            }}
          />
        </>
      ) : (
        <>
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title={"Pin"}
            icon={Icon.Pin}
            onAction={async () => {
              const folderPaths: string[] = [directory.directory.path];
              await pinFiles(folderPaths);
            }}
          />
        </>
      )}
    </MenuBarExtra.Submenu>
  );
}
