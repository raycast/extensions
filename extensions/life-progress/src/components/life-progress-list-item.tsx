import { isBirthDay } from "../utils/life-progress-utils";
import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { CountdownDate, LifeProgress } from "../types/types";
import { ActionOpenPreferences } from "./action-open-preferences";
import { spawnSync } from "child_process";
import { ActionAddCountdownDate, ActionRemoveCountdownDate } from "./action-countdown-date";

export function LifeProgressListItem(props: {
  cakeIndex: number;
  index: number;
  lifeProgressesLength: number;
  lifeProgress: LifeProgress;
  countdownDates: CountdownDate[];
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { cakeIndex, index, lifeProgressesLength, lifeProgress, countdownDates, setRefresh } = props;
  return (
    <List.Item
      icon={lifeProgress.icon}
      title={{
        value: lifeProgress.title,
        tooltip: lifeProgress.titleCanvas.canvas + "  " + lifeProgress.titleCanvas.text,
      }}
      subtitle={{ value: lifeProgress.subTitle, tooltip: lifeProgress.subTitle }}
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
          <ActionAddCountdownDate countdownDates={countdownDates} setRefresh={setRefresh} />
          {index > 9 && (
            <ActionRemoveCountdownDate
              countdownDates={countdownDates}
              setRefresh={setRefresh}
              lifeProgressesLength={lifeProgressesLength}
              index={index}
            />
          )}
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
