import { getPreferenceValues, Icon, MenuBarExtra, open, openCommandPreferences, showInFinder } from "@raycast/api";
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
      {commonDirectory.length !== 0 && (
        <MenuBarExtra.Section title={"Common Directory"}>
          {!loading &&
            commonDirectory.map((directory) => {
              return (
                <MenuBarExtra.Item
                  key={directory.id}
                  icon={{ fileIcon: directory.path }}
                  title={directory.name}
                  tooltip={directory.path}
                  onAction={async (event: MenuBarExtra.ActionEvent) => {
                    if (event.type == "left-click") {
                      await open(directory.path);
                    } else {
                      await showInFinder(directory.path);
                    }
                  }}
                />
              );
            })}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Separator />
      {openDirectory.length !== 0 && (
        <MenuBarExtra.Section title={"Open Directory"}>
          {openDirectory.map((directory) => {
            return (
              <MenuBarExtra.Item
                key={directory.path}
                icon={{ fileIcon: directory.path }}
                title={directory.name}
                tooltip={directory.path}
                onAction={async (event: MenuBarExtra.ActionEvent) => {
                  if (event.type == "left-click") {
                    await open(directory.path);
                  } else {
                    await showInFinder(directory.path);
                  }
                }}
              />
            );
          })}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={"Add Directory"}
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={async () => {
          await addDirectoryMenuBar();
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
