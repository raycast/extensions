import { Action, ActionPanel, List } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";
import React from "react";
import { isBirthDay } from "../utils/life-progress-utils";
import { spawnSync } from "child_process";

export function BirthdayItem() {
  return (
    <List.Item
      icon={"🎉"}
      title={"🎉🎉🎉 Happy Birthday! Go find your birthday cake! 🎉🎉🎉"}
      actions={
        <ActionPanel>
          {isBirthDay() && (
            <Action
              title={"Celebrate Birthday"}
              icon={"🎂"}
              onAction={async () => {
                spawnSync(`open raycast://confetti`, { shell: true });
              }}
            />
          )}
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
