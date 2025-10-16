import { ActionPanel, List } from "@raycast/api";
import { getLiftProgressCanvas } from "../utils/common-utils";
import { ActionOpenPreferences } from "./action-open-preferences";
import React, { Dispatch, SetStateAction } from "react";
import { getLeftNights, getSpendDays } from "../utils/life-progress-utils";
import { CountdownDate } from "../types/types";
import { ActionAddCountdownDate } from "./action-countdown-date";

export function LifeProgressCanvasItem(props: {
  countdownDates: CountdownDate[];
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { countdownDates, setRefresh } = props;
  const { canvas, text } = getLiftProgressCanvas(getSpendDays(), getLeftNights(), 40);
  return (
    <List.Item
      icon={"🎞"}
      title={{
        value: canvas,
        tooltip: `You're ${text} through your life.`,
      }}
      subtitle={`You're ${text} through your life.`}
      actions={
        <ActionPanel>
          <ActionAddCountdownDate countdownDates={countdownDates} setRefresh={setRefresh} />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
