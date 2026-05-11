import { Action, ActionPanel, confirmAlert, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import React from "react";
import CreateShortcut from "../create-shortcut";
import { Shortcut, ShortcutSource } from "../util/shortcut";

export function ActionEditShortcut(props: {
  shortcut: Shortcut;
  index: number;
  userShortcuts: Shortcut[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { shortcut, index, userShortcuts, setRefresh } = props;
  return (
    <ActionPanel.Section>
      <Action.Push
        title={"Create Shortcut"}
        icon={Icon.PlusCircle}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<CreateShortcut shortcut={undefined} setRefresh={setRefresh} />}
      />

      {shortcut.info.source === ShortcutSource.USER && (
        <>
          <Action.Push
            title={"Edit Shortcut"}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            icon={Icon.Pencil}
            target={<CreateShortcut shortcut={shortcut} setRefresh={setRefresh} />}
          />
          <Action
            title={"Remove Shortcut"}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              if (
                await confirmAlert({
                  icon: Icon.Trash,
                  title: "Remove Shortcut",
                  message: `Are you sure you want remove shortcut ${shortcut.info.name}?`,
                })
              ) {
                const newShortCuts = [...userShortcuts];
                newShortCuts.splice(index, 1);
                await showToast(Toast.Style.Success, "Successfully removed shortcut!");
                await LocalStorage.setItem("shortcuts", JSON.stringify(newShortCuts));
                setRefresh(Date.now());
              }
            }}
          />
          <Action
            title={"Remove All Shortcuts"}
            icon={Icon.ExclamationMark}
            shortcut={{ modifiers: ["shift", "ctrl"], key: "x" }}
            onAction={async () => {
              if (
                await confirmAlert({
                  icon: Icon.ExclamationMark,
                  title: "Remove All Shortcuts",
                  message: "Are you sure you want remove all custom shortcuts?",
                })
              ) {
                await showToast(Toast.Style.Success, "Successfully removed all shortcuts!");
                await LocalStorage.clear();
                setRefresh(Date.now());
              }
            }}
          />
        </>
      )}
    </ActionPanel.Section>
  );
}
