import { Application, Icon, launchCommand, LaunchType, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import React, { useMemo } from "react";
import { directory2File, isImage } from "./utils/common-utils";
import { DirectoryType, DirectoryWithFileInfo } from "./types/types";
import { parse } from "path";
import { MenuBarActionsOnFile, MenuBarActionsOnFolder } from "./components/menu-bar-actions";
import { primaryAction } from "./types/preferences";
import { usePinnedDirectories } from "./hooks/usePinnedDirectories";
import { useFrontmostApp } from "./hooks/useFrontmostApp";

export default function SearchPinsMenuBar() {
  const { data, isLoading } = usePinnedDirectories();
  const allDirectories = useMemo(() => {
    return data || [];
  }, [data]);
  const { data: frontmostApp } = useFrontmostApp();

  return (
    <MenuBarExtra icon={Icon.Finder} tooltip={"Quick Access"} isLoading={isLoading}>
      {allDirectories.map(
        (typeDirectory, index) =>
          typeDirectory.directories.length > 0 && (
            <MenuBarExtra.Section key={typeDirectory.type + index} title={typeDirectory.type}>
              {typeDirectory.directories.map((directory, directoryIndex) => (
                <FolderMenuBarItem
                  key={directory.directory.id + directoryIndex}
                  frontmostApp={frontmostApp}
                  directory={directory}
                  primaryAction={primaryAction}
                  directoryIndex={directoryIndex}
                />
              ))}
            </MenuBarExtra.Section>
          ),
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Pin"}
          icon={Icon.Tack}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={async () => {
            await launchCommand({ name: "pin", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Settings..."}
          icon={Icon.Gear}
          onAction={openCommandPreferences}
          shortcut={{ modifiers: ["cmd"], key: "," }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function FolderMenuBarItem(props: {
  frontmostApp: Application | undefined;
  directory: DirectoryWithFileInfo;
  primaryAction: string;
  directoryIndex: number;
}) {
  const { frontmostApp, directory, primaryAction, directoryIndex } = props;
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
        <MenuBarActionsOnFile
          frontmostApp={frontmostApp}
          primaryAction={primaryAction}
          fileValue={directory2File(directory.directory)}
        />
      )}
      {directory.files.map((fileValue, index) => (
        <MenuBarExtra.Submenu
          key={fileValue.path + index}
          icon={isImage(parse(fileValue.path).ext) ? { source: fileValue.path } : { fileIcon: fileValue.path }}
          title={fileValue.name}
        >
          <MenuBarActionsOnFile frontmostApp={frontmostApp} primaryAction={primaryAction} fileValue={fileValue} />
        </MenuBarExtra.Submenu>
      ))}
    </MenuBarExtra.Submenu>
  );
}
