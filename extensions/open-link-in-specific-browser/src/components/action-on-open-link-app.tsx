import { ItemInput } from "../utils/input-utils";
import React from "react";
import { Action, ActionPanel, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import {
  actionIcon,
  actionOnApplicationItem,
  actionTitle,
  clearAllRank,
  clearRank,
  upBrowserRank,
} from "../utils/open-link-utils";
import { ActionOpenPreferences } from "./action-open-preferences";
import { ActionAddOpenLinkApp } from "./action-add-open-link-app";
import { alertDialog } from "../hooks/hooks";
import { ItemType, LocalStorageKey, OpenLinkApplication } from "../types/types";

export function ActionOnOpenLinkApp(props: {
  isCustom: boolean;
  index: number;
  openLinkApplication: OpenLinkApplication;
  openLinkApplications: OpenLinkApplication[];
  itemInput: ItemInput;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { isCustom, index, openLinkApplication, openLinkApplications, itemInput, setRefresh } = props;

  return (
    <ActionPanel>
      <Action
        title={actionTitle(itemInput, openLinkApplication.name)}
        icon={actionIcon(itemInput)}
        onAction={async () => {
          await upBrowserRank(itemInput, openLinkApplication, openLinkApplications);
          await actionOnApplicationItem(itemInput, openLinkApplication, setRefresh);
        }}
      />
      {itemInput.type !== ItemType.NULL && (
        <Action
          title={"Detect Link"}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          icon={Icon.TwoArrowsClockwise}
          onAction={() => {
            setRefresh(Date.now());
          }}
        />
      )}

      <ActionPanel.Section>
        {!isCustom && <ActionAddOpenLinkApp curApp={openLinkApplication} setRefresh={setRefresh} />}
        {isCustom && (
          <>
            <Action
              title={"Remove Application"}
              icon={Icon.Trash}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const _openLinkApplications = [...openLinkApplications];
                _openLinkApplications.splice(index, 1);
                await LocalStorage.setItem(LocalStorageKey.CUSTOM_APPS, JSON.stringify(_openLinkApplications));
                setRefresh(Date.now());
              }}
            />

            <Action
              title={`Reset ${openLinkApplication.name} Rank`}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                await alertDialog(
                  Icon.Trash,
                  `Reset ${openLinkApplication.name} Rank`,
                  `Are you sure you want to reset ${openLinkApplication.name} rank?`,
                  "Reset",
                  async () => {
                    await clearRank(openLinkApplication, openLinkApplications);
                    setRefresh(Date.now());
                    await showToast(Toast.Style.Success, `Rank of ${openLinkApplication.name} Reset!`);
                  }
                );
              }}
            />
            <Action
              title={"Reset All Rank"}
              icon={Icon.ExclamationMark}
              shortcut={{ modifiers: ["shift", "cmd"], key: "r" }}
              onAction={async () => {
                await alertDialog(
                  Icon.Trash,
                  `Reset All Rank`,
                  `Are you sure you want to reset all rank?`,
                  "Reset All",
                  async () => {
                    await clearAllRank(openLinkApplications);
                    setRefresh(Date.now());
                    await showToast(Toast.Style.Success, "Rank of All Reset!");
                  }
                );
              }}
            />
          </>
        )}
      </ActionPanel.Section>
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
