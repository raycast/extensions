import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Entry, updateEntry } from "../db";
import { showErrorHUD, formatDuration, refreshMenuBar } from "../utils";

const DURATION_PRESETS = [
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

interface EditEntryViewProps {
  entry: Entry;
  onSave: () => void;
}

export function EditEntryView({ entry, onSave }: EditEntryViewProps) {
  const [searchText, setSearchText] = useState("");
  const { pop } = useNavigation();

  const handleUpdate = async (minutes: number) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving..." });
    try {
      await updateEntry(entry.uuid, { duration: minutes * 60 });
      toast.style = Toast.Style.Success;
      toast.title = "Entry updated";
      refreshMenuBar();
      onSave();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      await showErrorHUD("updating entry", error);
    }
  };

  const input = searchText.replace(/,/g, ".");
  const isHours = input.includes(".");
  const value = parseFloat(input);
  const customMinutes = isHours ? Math.round(value * 60) : Math.round(value);
  const hasValidCustom = !isNaN(customMinutes) && customMinutes > 0;

  const currentMinutes = Math.round(entry.duration / 60);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter new duration in minutes"
      navigationTitle={`Edit Entry: ${formatDuration(entry.duration)}`}
    >
      <List.Section title={`Current: ${formatDuration(entry.duration)}`}>
        {hasValidCustom && (
          <List.Item
            title={isHours ? `${value} hours` : `${customMinutes} minutes`}
            subtitle={isHours ? `${customMinutes} minutes` : undefined}
            icon={Icon.Pencil}
            actions={
              <ActionPanel>
                <Action title="Update" icon={Icon.Check} onAction={() => handleUpdate(customMinutes)} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Presets">
        {DURATION_PRESETS.map((preset) => (
          <List.Item
            key={preset.minutes}
            title={preset.label}
            icon={preset.minutes === currentMinutes ? Icon.CheckCircle : Icon.Circle}
            actions={
              <ActionPanel>
                <Action title="Update" icon={Icon.Check} onAction={() => handleUpdate(preset.minutes)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
