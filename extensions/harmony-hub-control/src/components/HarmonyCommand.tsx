import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import type { HarmonyHub, HarmonyDevice, HarmonyActivity, HarmonyCommand } from "../types/harmony";
import { ErrorCategory, HarmonyError } from "../types/errors";
import { HarmonyPreferences } from "../types/preferences";
import { FeedbackState } from "./FeedbackState";
import { useHarmony } from "../hooks/useHarmony";
import { Logger } from "../services/logger";

export type HarmonyStageType = "activities" | "devices";

interface HarmonyCommandProps {
  stage: HarmonyStageType;
  onStageChange: (stage: HarmonyStageType) => void;
}

export function HarmonyCommand({ stage, onStageChange }: HarmonyCommandProps): JSX.Element {
  const [error, setError] = useState<HarmonyError | null>(null);
  const preferences = getPreferenceValues<HarmonyPreferences>();
  const { defaultView } = preferences;

  const {
    loadingState,
    activities,
    devices,
    currentActivity,
    startActivity,
    stopActivity,
    executeCommand,
  } = useHarmony();

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
    return (
      <FeedbackState
        icon={Icon.ExclamationMark}
        title="Error"
        description={error.message}
        error={error}
      />
    );
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
            onAction={() =>
              onStageChange(stage === "activities" ? "devices" : "activities")
            }
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
                    onAction={() =>
                      currentActivity?.id === activity.id ? stopActivity() : startActivity(activity.id)
                    }
                  />
                  <Action
                    icon={Icon.Switch}
                    title="Show Devices"
                    onAction={() => onStageChange("devices")}
                  />
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
                    <Action
                      key={command.name}
                      title={command.name}
                      onAction={() => executeCommand(command)}
                    />
                  ))}
                  <Action
                    icon={Icon.Switch}
                    title="Show Activities"
                    onAction={() => onStageChange("activities")}
                  />
                </ActionPanel>
              }
            />
          ))}
    </List>
  );
}
