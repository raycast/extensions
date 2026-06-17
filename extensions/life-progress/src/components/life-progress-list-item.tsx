import { ActionPanel, List } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { CountdownDate, LifeProgressType } from "../types/types";
import { ActionOpenPreferences } from "./action-open-preferences";
import { ActionAddCountdownDate, ActionRemoveCountdownDate } from "./action-countdown-date";

export function LifeProgressListItem(props: {
  index: number;
  lifeProgressesLength: number;
  lifeProgress: LifeProgressType;
  countdownDates: CountdownDate[];
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { index, lifeProgressesLength, lifeProgress, countdownDates, setRefresh } = props;
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
