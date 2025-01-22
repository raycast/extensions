import React from "react";
import { List, ActionPanel } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { TIME_FORMAT_OPTIONS, FASTING_DURATION_MS, FASTING_COLOR } from "../constants";
import { StopFasting } from "./actions/stopFasting";
import { EditFasting } from "./actions/editFasting";
import { FastingViewProps } from "../types";
import { formatTime, calculateFastingProgress } from "../utils";
import { ViewHistory } from "./actions/viewHistory";

export const FastingView: React.FC<FastingViewProps> = ({ runningFast, stopTimer, revalidate, data, isLoading }) => {
  const endTime = new Date(runningFast.start.getTime() + FASTING_DURATION_MS);
  const progressPercentage = calculateFastingProgress(runningFast.start, null, FASTING_DURATION_MS);

  return (
    <List.EmptyView
      title={`Fasting Progress: ${progressPercentage}%`}
      description={`Started at ${formatTime(runningFast.start, TIME_FORMAT_OPTIONS)} ${
        progressPercentage >= 100
          ? `・ Ended at ${formatTime(endTime, TIME_FORMAT_OPTIONS)}`
          : `・ Remaining: ${runningFast.remainingHours}h ${runningFast.remainingMinutes}m ・ Ends at ${formatTime(endTime, TIME_FORMAT_OPTIONS)}`
      }`}
      icon={getProgressIcon(Math.min(progressPercentage / 100, 1), FASTING_COLOR)}
      actions={
        <ActionPanel>
          <StopFasting stopItem={() => stopTimer(runningFast)} revalidate={revalidate} />
          <EditFasting runningFast={runningFast} revalidate={revalidate} />
          <ViewHistory fastingHistory={data} revalidate={revalidate} isLoading={isLoading} />
        </ActionPanel>
      }
    />
  );
};
