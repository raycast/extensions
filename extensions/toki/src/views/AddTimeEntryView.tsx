import { Action, ActionPanel, Icon, List, showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { useState } from "react";
import { Group, Activity, createEntry } from "../db";
import { showErrorHUD, refreshMenuBar } from "../utils";

const PRESETS = [
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 45, label: "45 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 90, label: "1.5 hours" },
  { minutes: 120, label: "2 hours" },
  { minutes: 180, label: "3 hours" },
  { minutes: 240, label: "4 hours" },
  { minutes: 480, label: "8 hours" },
];

interface AddTimeEntryViewProps {
  group: Group;
  activity: Activity;
}

export function AddTimeEntryView({ group, activity }: AddTimeEntryViewProps) {
  const [searchText, setSearchText] = useState("");

  const handleAddEntry = async (minutes: number) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding entry...",
    });

    try {
      const now = new Date();
      const date = now.toISOString().split("T")[0];
      const time = now.toTimeString().slice(0, 5);
      const durationSeconds = minutes * 60;

      await createEntry(group.uuid, activity.uuid, durationSeconds, date, time);
      refreshMenuBar();
      closeMainWindow();
      await showHUD(`Added ${minutes}min to ${activity.title}`);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to add entry";
      await showErrorHUD("adding time entry", error);
    }
  };

  const input = searchText.replace(/,/g, ".");
  const isHours = input.includes(".");
  const value = parseFloat(input);
  const customMinutes = isHours ? Math.round(value * 60) : Math.round(value);
  const hasValidCustom = !isNaN(customMinutes) && customMinutes > 0;

  const filteredPresets = PRESETS.filter((p) => p.label.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search or enter minutes"
      navigationTitle={`Add Time: ${activity.title}`}
    >
      {hasValidCustom && (
        <List.Section title="Custom">
          <List.Item
            title={isHours ? `${value} hours` : `${customMinutes} minutes`}
            subtitle={isHours ? `${customMinutes} minutes` : `${(customMinutes / 60).toFixed(1)} hours`}
            icon={Icon.PlusCircle}
            actions={
              <ActionPanel>
                <Action title="Add Entry" icon={Icon.PlusCircle} onAction={() => handleAddEntry(customMinutes)} />
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
            icon={Icon.PlusCircle}
            actions={
              <ActionPanel>
                <Action title="Add Entry" icon={Icon.PlusCircle} onAction={() => handleAddEntry(preset.minutes)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
