import { Action, ActionPanel, Icon, List, showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { Group, Activity, startTracking, adjustTracking } from "../db";
import { showErrorHUD, refreshMenuBar } from "../utils";

const PRESETS = [
  { minutes: -5, label: "5 minutes ago" },
  { minutes: -10, label: "10 minutes ago" },
  { minutes: -15, label: "15 minutes ago" },
  { minutes: -30, label: "30 minutes ago" },
  { minutes: -45, label: "45 minutes ago" },
  { minutes: -60, label: "1 hour ago" },
  { minutes: -90, label: "1.5 hours ago" },
  { minutes: -120, label: "2 hours ago" },
];

interface AdjustStartTimeViewProps {
  group: Group;
  activity: Activity;
}

export function AdjustStartTimeView({ group, activity }: AdjustStartTimeViewProps) {
  const [searchText, setSearchText] = useState("");
  const [isStarting, setIsStarting] = useState(true);
  const hasStarted = useRef(false);

  // Start tracking on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function start() {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Starting..." });
      try {
        await startTracking(group.uuid, activity.uuid);
        toast.style = Toast.Style.Success;
        toast.title = "Started tracking";
        toast.message = "Now adjust the start time";
        refreshMenuBar();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to start";
        await showErrorHUD("starting tracking", error);
      }
      setIsStarting(false);
    }
    start();
  }, [group.uuid, activity.uuid]);

  const handleAdjust = async (minutes: number) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adjusting..." });

    try {
      await adjustTracking(minutes);
      await refreshMenuBar();
      closeMainWindow();
      await showHUD(`Adjusted: ${Math.abs(minutes)}min ${minutes < 0 ? "earlier" : "later"}`);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to adjust";
      await showErrorHUD("adjusting start time", error);
    }
  };

  const customMinutes = parseInt(searchText, 10);
  const hasValidCustom = !isNaN(customMinutes) && customMinutes !== 0;

  const filteredPresets = PRESETS.filter((p) => p.label.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List
      isLoading={isStarting}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search or enter minutes (negative = earlier)"
      navigationTitle={`Adjust: ${activity.title}`}
    >
      {hasValidCustom && (
        <List.Section title="Custom">
          <List.Item
            title={`${Math.abs(customMinutes)} minutes ${customMinutes < 0 ? "earlier" : "later"}`}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action title="Adjust" icon={Icon.Clock} onAction={() => handleAdjust(customMinutes)} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Presets">
        {filteredPresets.map((preset) => (
          <List.Item
            key={preset.minutes}
            title={preset.label}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action title="Adjust" icon={Icon.Clock} onAction={() => handleAdjust(preset.minutes)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
