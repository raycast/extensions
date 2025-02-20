import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import { useHarmony } from "../hooks/useHarmony";
import { HarmonyError } from "../types/errors";
import type { HarmonyDevice, HarmonyActivity, HarmonyCommand, HarmonyHub } from "../types/harmony";
import { HarmonyStage } from "../types/harmony";
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

  const { loadingState, hubs, selectedHub, activities, devices, currentActivity, connect, startActivity, stopActivity, executeCommand } =
    useHarmony();

  const isLoading = loadingState?.stage !== HarmonyStage.CONNECTED && loadingState?.stage !== HarmonyStage.INITIAL;
  const discoveryProgress = loadingState?.message;

  // Set initial stage based on preference, but only once
  useEffect(() => {
    if (preferences.defaultView && !stage) {
      onStageChange(preferences.defaultView);
    }
  }, []);

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

  // Show hub selection if we have hubs but none selected
  if (!selectedHub && hubs.length > 0) {
    return (
      <List
        searchBarPlaceholder="Search hubs..."
        navigationTitle="Select Harmony Hub"
      >
        {hubs.map((hub: HarmonyHub) => (
          <List.Item
            key={hub.id}
            title={hub.name}
            subtitle={hub.ip}
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action
                  title="Connect"
                  icon={Icon.Link}
                  onAction={() => connect(hub)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Show loading if we don't have activities or devices yet
  if (!activities.length || !devices.length) {
    return (
      <FeedbackState
        icon={Icon.Clock}
        title="Loading"
        description="Loading devices and activities..."
      />
    );
  }

  return (
    <List
      searchBarPlaceholder={stage === "activities" ? "Search activities..." : "Search devices..."}
      navigationTitle={stage === "activities" ? "Harmony Activities" : "Harmony Devices"}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Switch}
            title={stage === "activities" ? "Show Devices" : "Show Activities"}
            onAction={() => onStageChange(stage === "activities" ? "devices" : "activities")}
            shortcut={{ modifiers: ["cmd"], key: "tab" }}
          />
        </ActionPanel>
      }
    >
      {stage === "activities" ? (
        activities.map((activity: HarmonyActivity) => (
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
                <Action 
                  icon={Icon.Switch} 
                  title="Show Devices" 
                  onAction={() => onStageChange("devices")}
                  shortcut={{ modifiers: ["cmd"], key: "tab" }}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        devices.map((device: HarmonyDevice) => (
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
                    onAction={() => executeCommand({
                      ...command,
                      deviceId: device.id
                    })} 
                  />
                ))}
                <Action 
                  icon={Icon.Switch} 
                  title="Show Activities" 
                  onAction={() => onStageChange("activities")}
                  shortcut={{ modifiers: ["cmd"], key: "tab" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
