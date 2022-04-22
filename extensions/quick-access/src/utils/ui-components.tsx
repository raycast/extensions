import { Action, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { alertDialog, refreshNumber } from "../hooks/hooks";
import { LocalStorageKey } from "./constants";
import React from "react";

export function ActionRemoveAllDirectories(props: { setRefresh: React.Dispatch<React.SetStateAction<number>> }) {
  const { setRefresh } = props;
  return (
    <Action
      icon={Icon.ExclamationMark}
      title={`Remove All Directory`}
      shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
      onAction={async () => {
        await alertDialog(
          "⚠️Warning",
          "Do you want to remove all directories?",
          "Remove All",
          async () => {
            await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify([]));
            setRefresh(refreshNumber);
            await showToast(Toast.Style.Success, "Success!", `All directories are removed.`);
          },
          async () => {
            await showToast(Toast.Style.Failure, "Error!", `Operation is canceled.`);
          }
        );
      }}
    />
  );
}
