import { isBirthDay } from "../utils/life-progress-utils";
import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import React from "react";
import { LifeProgress } from "../types/types";
import { ActionOpenPreferences } from "./action-open-preferences";
import { spawnSync } from "child_process";

export function LifeProgressListItem(props: { cakeIndex: number; index: number; lifeProgress: LifeProgress }) {
  const cakeIndex = props.cakeIndex;
  const index = props.index;
  const lifeProgress = props.lifeProgress;
  return (
    <List.Item
      icon={lifeProgress.icon}
      title={{
        value: lifeProgress.title,
        tooltip: lifeProgress.titleCanvas.canvas + "  " + lifeProgress.titleCanvas.text,
      }}
      accessories={lifeProgress.accessUnit}
      actions={
        <ActionPanel>
          {isBirthDay() && (
            <Action
              title={"Rummage Here"}
              icon={"🎂"}
              onAction={async () => {
                if (cakeIndex == index) {
                  spawnSync(`open raycast://confetti`, { shell: true });
                  await showToast(Toast.Style.Success, "You found the 🎂", "Enjoy it!");
                } else {
                  await showToast(Toast.Style.Failure, "The 🎂 is not here.", "Try again somewhere else.");
                }
              }}
            />
          )}
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
