import { ActionPanel, List } from "@raycast/api";
import { getLiftProgressCanvas } from "../utils/common-utils";
import { ActionOpenPreferences } from "./action-open-preferences";
import React from "react";
import { getLeftNights, getSpendDays } from "../utils/life-progress-utils";

export function LifeProgressCanvasItem() {
  return (
    <List.Item
      icon={"🎞"}
      title={getLiftProgressCanvas(getSpendDays(), getLeftNights(), 40, true).canvas}
      subtitle={getLiftProgressCanvas(getSpendDays(), getLeftNights(), 40, true).text}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
