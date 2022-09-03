import { getPreferenceValues, Icon, MenuBarExtra, open } from "@raycast/api";
import { LocalDirectoryKey } from "./types/directory-info";
import React from "react";
import { addDirectoryMenuBar } from "./utils/common-utils";
import { getCommonDirectory } from "./hooks/hooks";
import { Preferences } from "./types/preferences";

export default function OpenCommonDirectory() {
  const { sortBy, showOpenDirectory } = getPreferenceValues<Preferences>();

  const { commonDirectory, openDirectory, loading } = getCommonDirectory(
    0,
    sortBy,
    showOpenDirectory,
    LocalDirectoryKey.OPEN_COMMON_DIRECTORY
  );

  return (
    <MenuBarExtra
      isLoading={loading}
      icon={{
        source: {
          light: "common-directory-menu-bar.png",
          dark: "common-directory-menu-bar@dark.png",
        },
      }}
    >
      {commonDirectory.length !== 0 && <MenuBarExtra.Item title={"Common Directory"} />}
      {!loading &&
        commonDirectory.map((directory) => {
          return (
            <MenuBarExtra.Item
              icon={{ fileIcon: directory.path }}
              title={directory.name}
              tooltip={directory.path}
              onAction={async () => {
                await open(directory.path);
              }}
            />
          );
        })}
      {openDirectory.length !== 0 && <MenuBarExtra.Item title={"Open Directory"} />}
      {openDirectory.map((directory) => {
        return (
          <MenuBarExtra.Item
            icon={{ fileIcon: directory.path }}
            title={directory.name}
            tooltip={directory.path}
            onAction={async () => {
              await open(directory.path);
            }}
          />
        );
      })}
      <MenuBarExtra.Item
        title={"Add Directory"}
        icon={Icon.Plus}
        onAction={async () => {
          await addDirectoryMenuBar();
        }}
      />
    </MenuBarExtra>
  );
}
