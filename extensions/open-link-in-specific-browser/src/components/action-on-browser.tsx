import { ItemInput } from "../utils/input-utils";
import React from "react";
import { Action, ActionPanel, Application, Icon } from "@raycast/api";
import { actionIcon, actionOnApplicationItem, actionTitle } from "../utils/open-link-utils";
import { ActionOpenPreferences } from "./action-open-preferences";
import { ItemType } from "../types/types";
import { openDefaultBrowserSetting } from "../utils/common-utils";

export function ActionOnBrowser(props: {
  browser: Application;
  itemInput: ItemInput;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  visitItem: (item: Application) => void;
  resetRanking: (item: Application) => Promise<void>;
}) {
  const { browser, itemInput, setRefresh, visitItem, resetRanking } = props;

  return (
    <ActionPanel>
      <Action
        title={actionTitle(itemInput, browser.name)}
        icon={actionIcon(itemInput)}
        onAction={async () => {
          await actionOnApplicationItem(itemInput, browser, setRefresh);
          visitItem(browser);
        }}
      />
      {itemInput.type !== ItemType.NULL && (
        <Action
          title={"Detect Link"}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          icon={Icon.Repeat}
          onAction={() => {
            setRefresh(Date.now());
          }}
        />
      )}
      <ActionPanel.Section>
        <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={"Reset Ranking"}
          icon={Icon.ArrowCounterClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            await resetRanking(browser);
            setRefresh(Date.now());
          }}
        />

        <Action
          title={"Set Default Browser"}
          icon={Icon.Compass}
          shortcut={{ modifiers: ["ctrl"], key: "d" }}
          onAction={async () => {
            await openDefaultBrowserSetting();
          }}
        />
      </ActionPanel.Section>
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
