import { Action, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { LocalStorageKey } from "../utils/constants";
import React from "react";
import { alertDialog, getLocalStorage, isEmpty, moveElement } from "../utils/common-utils";
import { DirectoryWithFileInfo, TypeDirectory } from "../types/types";
import { MutatePromise } from "@raycast/utils";
import { ActionLaunchPin } from "./action-launch-pin";

export function ActionOnPins(props: {
  pinnedDirectories: DirectoryWithFileInfo[];
  directoryIndex: number;
  directory: DirectoryWithFileInfo;
  mutate: MutatePromise<TypeDirectory[] | undefined, TypeDirectory[] | undefined>;
}) {
  const { pinnedDirectories, directoryIndex, directory, mutate } = props;
  return (
    <>
      <ActionLaunchPin />
      <Action
        icon={Icon.TackDisabled}
        title={`Unpin`}
        shortcut={{ modifiers: ["cmd"], key: "u" }}
        onAction={async () => {
          await alertDialog(
            Icon.TackDisabled,
            "Unpin",
            `Are you sure you want to unpin the ${directory.directory.name}?`,
            "Unpin",
            async () => {
              const localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
              const _localDirectory = isEmpty(localstorage) ? [] : JSON.parse(localstorage);
              _localDirectory.splice(directoryIndex, 1);
              await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify(_localDirectory));
              await mutate();
              await showToast(Toast.Style.Success, "Success!", `${directory.directory.name} is unpinned.`);
            },
          );
        }}
      />
      <Action
        icon={Icon.TackDisabled}
        title={`Unpin All`}
        shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
        onAction={async () => {
          await alertDialog(
            Icon.TackDisabled,
            "Unpin All",
            "Are you sure you  want to unpin all files and folders?",
            "Unpin All",
            async () => {
              await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify([]));
              await mutate();
              await showToast(Toast.Style.Success, "Success!", `All files and folders are unpinned.`);
            },
          );
        }}
      />

      {directoryIndex !== 0 && (
        <Action
          icon={Icon.ArrowUp}
          title={"Up"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "arrowUp" }}
          onAction={async () => {
            const localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
            const pinnedDirectories = isEmpty(localstorage) ? [] : JSON.parse(localstorage);
            await LocalStorage.setItem(
              LocalStorageKey.LOCAL_PIN_DIRECTORY,
              JSON.stringify(moveElement(pinnedDirectories, directoryIndex, -1)),
            );
            await mutate();
          }}
        />
      )}
      {directoryIndex != pinnedDirectories.length - 1 && (
        <Action
          icon={Icon.ArrowDown}
          title={"Down"}
          shortcut={{ modifiers: ["shift", "cmd"], key: "arrowDown" }}
          onAction={async () => {
            const localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
            const pinnedDirectories = isEmpty(localstorage) ? [] : JSON.parse(localstorage);
            await LocalStorage.setItem(
              LocalStorageKey.LOCAL_PIN_DIRECTORY,
              JSON.stringify(moveElement(pinnedDirectories, directoryIndex, 1)),
            );
            await mutate();
          }}
        />
      )}
    </>
  );
}
