import { Action, ActionPanel, List } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";
import React, { Dispatch, SetStateAction } from "react";
import { isBirthDay } from "../utils/life-progress-utils";
import { spawnSync } from "child_process";
import { CountdownDate } from "../types/types";
import { ActionAddCountdownDate } from "./action-countdown-date";

export function BirthdayItem(props: { countdownDates: CountdownDate[]; setRefresh: Dispatch<SetStateAction<number>> }) {
  const { countdownDates, setRefresh } = props;
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
          <ActionAddCountdownDate countdownDates={countdownDates} setRefresh={setRefresh} />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
