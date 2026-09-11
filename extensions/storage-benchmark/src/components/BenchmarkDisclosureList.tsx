import { Color, Icon, List } from "@raycast/api";
import os from "node:os";
import path from "node:path";
import { type ReactNode, useEffect, useState } from "react";
import { formatBinaryBytes, formatDuration } from "../presentation/format";

interface BenchmarkDisclosureListProps {
  destinationRoot: string;
  maxBytes: number;
  targetDurationSeconds: number;
  destinationActions: ReactNode;
  maximumDataActions: ReactNode;
  timeTargetActions: ReactNode;
  safeguardActions: ReactNode;
}

export function BenchmarkDisclosureList({
  destinationRoot,
  maxBytes,
  targetDurationSeconds,
  destinationActions,
  maximumDataActions,
  timeTargetActions,
  safeguardActions,
}: BenchmarkDisclosureListProps) {
  const [searchText, setSearchText] = useState(" ");
  const [selectedItemId, setSelectedItemId] = useState("destination");

  useEffect(() => {
    // Raycast otherwise carries the previous List's search text and row index into this view.
    setSearchText("");
    const focusTimer = setTimeout(() => setSelectedItemId("destination"), 50);
    return () => clearTimeout(focusTimer);
  }, []);

  return (
    <List
      navigationTitle="Ready to Test"
      searchBarPlaceholder="Review Test Setup"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id) setSelectedItemId(id);
      }}
    >
      <List.Section title="Test Configuration">
        <List.Item
          id="destination"
          title="Selected Folder"
          subtitle={compactPath(destinationRoot)}
          icon={{ source: Icon.Folder, tintColor: Color.Blue }}
          actions={destinationActions}
        />
        <List.Item
          id="maximum-test-data"
          title="Maximum Test Data"
          subtitle="Private temporary benchmark file"
          icon={{ source: Icon.Gauge, tintColor: Color.Blue }}
          accessories={[{ text: formatBinaryBytes(maxBytes) }]}
          actions={maximumDataActions}
        />
        <List.Item
          id="time-target"
          title="Time Target"
          subtitle="Each measured phase"
          icon={{ source: Icon.Stopwatch, tintColor: Color.Blue }}
          accessories={[{ text: `Up to ${formatDuration(targetDurationSeconds)}` }]}
          actions={timeTargetActions}
        />
      </List.Section>
      <List.Section title="Safeguards" subtitle="Write → measure → delete">
        <List.Item
          id="automatic-cleanup"
          title="Automatic Cleanup"
          subtitle="Temporary data is removed after success, failure, or cancellation"
          icon={{ source: Icon.Trash, tintColor: Color.Green }}
          accessories={[{ tag: { value: "Enabled", color: Color.Green } }]}
          actions={safeguardActions}
        />
        <List.Item
          id="local-only"
          title="Local Only"
          subtitle="No telemetry or test contents leave this Mac"
          icon={{ source: Icon.Lock, tintColor: Color.Green }}
          accessories={[{ tag: { value: "Private", color: Color.Green } }]}
          actions={safeguardActions}
        />
        <List.Item
          id="cancel-any-time"
          title="Cancel Any Time"
          subtitle="During a run, closing the view also stops the test"
          icon={{ source: Icon.Stop, tintColor: Color.Orange }}
          actions={safeguardActions}
        />
        <List.Item
          id="performance-only"
          title="Performance Test Only"
          subtitle="Does not diagnose physical disk health"
          icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
          actions={safeguardActions}
        />
      </List.Section>
    </List>
  );
}

function compactPath(destinationRoot: string): string {
  const homeDirectory = os.homedir();
  if (destinationRoot === homeDirectory) return "~";
  if (destinationRoot.startsWith(`${homeDirectory}${path.sep}`))
    return `~${destinationRoot.slice(homeDirectory.length)}`;
  return destinationRoot;
}
