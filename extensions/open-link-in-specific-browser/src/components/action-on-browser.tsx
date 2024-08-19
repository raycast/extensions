import { ItemInput } from "../utils/input-utils";
import React from "react";
import { Action, ActionPanel, Application, Icon } from "@raycast/api";
import { actionIcon, actionOnApplicationItem, actionTitle } from "../utils/open-link-utils";
import { ActionOpenPreferences } from "./action-open-preferences";
import { ItemType } from "../types/types";
import { openDefaultBrowserSetting } from "../utils/common-utils";
import { MutatePromise } from "@raycast/utils";

export function ActionOnBrowser(props: {
  browser: Application;
  itemInput: ItemInput;
  visitItem: (item: Application) => void;
  resetRanking: (item: Application) => Promise<void>;
  mutate: MutatePromise<ItemInput, undefined>;
}) {
  const { browser, itemInput, visitItem, resetRanking, mutate } = props;

  return (
    <ActionPanel>
      <Action
        title={actionTitle(itemInput, browser.name)}
        icon={actionIcon(itemInput)}
        onAction={async () => {
          await actionOnApplicationItem(itemInput, browser);
          visitItem(browser);
          await mutate();
        }}
      />
      {itemInput.type !== ItemType.NULL && (
        <Action
          title={"Refresh Link"}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          icon={Icon.Repeat}
          onAction={async () => {
            await mutate();
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
          shortcut={{ modifiers: ["ctrl", "cmd"], key: "r" }}
          onAction={async () => {
            await resetRanking(browser);
            await mutate();
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
