import { Action, ActionPanel, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { alertDialog, refreshNumber } from "../hooks/hooks";
import { LocalStorageKey } from "../utils/constants";
import React from "react";
import { getLocalStorage, isEmpty } from "../utils/common-utils";
import { ActionRemoveAllDirectories, ActionsOnFile } from "./action-on-files";
import { pinFiles } from "../pin";
import { DirectoryInfo, DirectoryWithFileInfo, FileInfo } from "../types/types";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function ActionOnPins(props: {
  primaryAction: string;
  directoryIndex: number;
  directory: DirectoryWithFileInfo;
  file: FileInfo;
  showDetail: boolean;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  setRefreshDetail: React.Dispatch<React.SetStateAction<number>> | undefined;
}) {
  const { primaryAction, directoryIndex, directory, file, showDetail, setRefresh, setRefreshDetail } = props;
  return (
    <ActionPanel>
      <ActionsOnFile
        isTopFolder={true}
        primaryAction={primaryAction}
        name={file.name}
        path={file.path}
        index={directoryIndex}
        setRefresh={setRefresh}
      />
      <ActionPanel.Section>
        <Action
          icon={Icon.Pin}
          title={`Pin`}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={async () => {
            await pinFiles([], false);
            setRefresh(refreshNumber());
          }}
        />
        <Action
          icon={Icon.PinDisabled}
          title={`Unpin`}
          shortcut={{ modifiers: ["cmd", "ctrl"], key: "x" }}
          onAction={async () => {
            await alertDialog(
              Icon.XMarkCircle,
              "Unpin",
              `Are you sure you want to unpin the ${directory.directory.name}?`,
              "Unpin",
              async () => {
                const localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
                const _localDirectory = isEmpty(localstorage) ? [] : JSON.parse(localstorage);
                _localDirectory.splice(directoryIndex, 1);
                await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify(_localDirectory));
                setRefresh(refreshNumber());
                await showToast(Toast.Style.Success, "Success!", `${directory.directory.name} is unpinned.`);
              }
            );
          }}
        />
        <ActionRemoveAllDirectories setRefresh={setRefresh} />
        <Action
          icon={Icon.ArrowClockwise}
          title={`Reset Rank`}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
          onAction={async () => {
            await alertDialog(
              Icon.ExclamationMark,
              "Reset All Ranks",
              "Are you sure you want to reset all ranks?",
              "Reset All",
              async () => {
                const localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
                const _localDirectory: DirectoryInfo[] = isEmpty(localstorage) ? [] : JSON.parse(localstorage);

                const _pinnedDirectory = _localDirectory.map((value) => {
                  value.rank = 1;
                  return value;
                });
                await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify(_pinnedDirectory));
                setRefresh(refreshNumber());
                await showToast(Toast.Style.Success, "Success!", `All ranks are reset.`);
              }
            );
          }}
        />
      </ActionPanel.Section>

      {typeof setRefreshDetail !== "undefined" && (
        <ActionPanel.Section>
          <Action
            title={"Toggle Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["shift", "ctrl"], key: "d" }}
            onAction={async () => {
              await LocalStorage.setItem("isShowDetail", !showDetail);
              setRefreshDetail(Date.now);
            }}
          />
        </ActionPanel.Section>
      )}

      <ActionOpenCommandPreferences />
    </ActionPanel>
  );
}
