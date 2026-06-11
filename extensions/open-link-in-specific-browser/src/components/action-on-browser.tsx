import { ItemInput } from "../utils/input-utils";
import React from "react";
import { Action, ActionPanel, Application, Alert, confirmAlert, Icon, Keyboard } from "@raycast/api";
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
  isHidden?: boolean;
  showHidden?: boolean;
  hasHiddenBrowsers?: boolean;
  onToggleShowHidden?: () => void;
  onHide?: (browser: Application) => Promise<void>;
  onUnhide?: (browser: Application) => Promise<void>;
  onUnhideAll?: () => Promise<void>;
}) {
  const {
    browser,
    itemInput,
    visitItem,
    resetRanking,
    mutate,
    isHidden,
    showHidden,
    hasHiddenBrowsers,
    onToggleShowHidden,
    onHide,
    onUnhide,
    onUnhideAll,
  } = props;

  const hideShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "h" };
  const toggleShortcut: Keyboard.Shortcut = { modifiers: ["shift", "cmd"], key: "h" };

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
        {isHidden
          ? onUnhide && (
              <Action
                title={"Unhide Browser"}
                icon={Icon.Eye}
                shortcut={hideShortcut}
                onAction={async () => {
                  await onUnhide(browser);
                }}
              />
            )
          : onHide && (
              <Action
                title={"Hide Browser"}
                icon={Icon.EyeDisabled}
                shortcut={hideShortcut}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: `Hide ${browser.name}?`,
                    message: "You can show hidden browsers again from the action menu.",
                    primaryAction: { title: "Hide", style: Alert.ActionStyle.Destructive },
                  });
                  if (confirmed) await onHide(browser);
                }}
              />
            )}
        {hasHiddenBrowsers && onToggleShowHidden && (
          <Action
            title={showHidden ? "Hide Hidden Browsers" : "Show Hidden Browsers"}
            icon={showHidden ? Icon.EyeDisabled : Icon.Eye}
            shortcut={toggleShortcut}
            onAction={onToggleShowHidden}
          />
        )}
        {hasHiddenBrowsers && onUnhideAll && (
          <Action
            title={"Unhide All Browsers"}
            icon={Icon.Eye}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Unhide all browsers?",
                primaryAction: { title: "Unhide All" },
              });
              if (confirmed) await onUnhideAll();
            }}
          />
        )}
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
