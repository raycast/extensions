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
  return (
    <List.Item
      icon={"🎞"}
      title={getLiftProgressCanvas(getSpendDays(), getLeftNights(), 40, true).canvas}
      subtitle={getLiftProgressCanvas(getSpendDays(), getLeftNights(), 40, true).text}
      actions={
        <ActionPanel>
          <ActionAddCountdownDate countdownDates={countdownDates} setRefresh={setRefresh} />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
