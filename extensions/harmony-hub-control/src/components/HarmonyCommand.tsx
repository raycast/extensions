import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import { useHarmony } from "../hooks/useHarmony";
import { HarmonyError } from "../types/errors";
import type { HarmonyDevice, HarmonyActivity, HarmonyCommand } from "../types/harmony";
import { HarmonyPreferences } from "../types/preferences";

import { FeedbackState } from "./FeedbackState";

export type HarmonyStageType = "activities" | "devices";

export function HarmonyCommand({
  stage,
  onStageChange,
}: {
  stage: HarmonyStageType;
  onStageChange: (stage: HarmonyStageType) => void;
}): JSX.Element {
  const [error] = useState<HarmonyError | null>(null);
  const preferences = getPreferenceValues<HarmonyPreferences>();
  const { defaultView } = preferences;

  const { loadingState, activities, devices, currentActivity, startActivity, stopActivity, executeCommand } =
    useHarmony();

  const isLoading = loadingState?.stage !== undefined;
  const discoveryProgress = loadingState?.message;

  useEffect(() => {
    if (defaultView === "activities" && stage === "devices") {
      onStageChange("activities");
    } else if (defaultView === "devices" && stage === "activities") {
      onStageChange("devices");
    }
  }, [defaultView, stage, onStageChange]);

  if (error) {
    return <FeedbackState icon={Icon.ExclamationMark} title="Error" description={error.message} error={error} />;
  }

  if (isLoading) {
    return (
      <FeedbackState
        icon={Icon.Clock}
        title="Loading"
        description={discoveryProgress || "Connecting to Harmony Hub..."}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={stage === "activities" ? "Search activities..." : "Search devices..."}
      navigationTitle={stage === "activities" ? "Harmony Activities" : "Harmony Devices"}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Switch}
            title={stage === "activities" ? "Show Devices" : "Show Activities"}
            onAction={() => onStageChange(stage === "activities" ? "devices" : "activities")}
          />
        </ActionPanel>
      }
    >
      {stage === "activities"
        ? activities.map((activity: HarmonyActivity) => (
            <List.Item
              key={activity.id}
              title={activity.name}
              icon={activity.type === "av" ? Icon.Video : Icon.Circle}
              actions={
                <ActionPanel>
                  <Action
                    title={currentActivity?.id === activity.id ? "Stop Activity" : "Start Activity"}
                    icon={currentActivity?.id === activity.id ? Icon.Stop : Icon.Play}
                    onAction={() => (currentActivity?.id === activity.id ? stopActivity() : startActivity(activity.id))}
                  />
                  <Action icon={Icon.Switch} title="Show Devices" onAction={() => onStageChange("devices")} />
                </ActionPanel>
              }
            />
          ))
        : devices.map((device: HarmonyDevice) => (
            <List.Item
              key={device.id}
              title={device.name}
              icon={Icon.Video}
              actions={
                <ActionPanel>
                  {device.commands.map((command: HarmonyCommand) => (
                    <Action key={command.name} title={command.name} onAction={() => executeCommand(command)} />
                  ))}
                  <Action icon={Icon.Switch} title="Show Activities" onAction={() => onStageChange("activities")} />
                </ActionPanel>
              }
            />
          ))}
    </List>
  );
}
