import { List, ActionPanel, Action, Icon, Color, showToast, Toast, LaunchProps } from "@raycast/api";
import { useState } from "react";
import {
  bedtimesForWake,
  formatTime,
  formatDuration,
  parseTimeInput,
  getSleepQuality,
  SleepTime,
  FALL_ASLEEP_BUFFER,
  CYCLE_LENGTH,
} from "./lib/sleep-utils";

interface Arguments {
  wakeUpTime: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const initialTime = props.arguments.wakeUpTime;
  const [searchText, setSearchText] = useState("");
  const [showMoreUsed, setShowMoreUsed] = useState(false);

  // Use search text if provided, otherwise fall back to initial argument
  const timeInput = searchText.trim() || initialTime;
  const parsed = parseTimeInput(timeInput);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
  };

  const handleShowMore = () => {
    setShowMoreUsed(true);
    showToast({
      style: Toast.Style.Success,
      title: "Showing More Options",
    });
  };

  if (!parsed) {
    if (timeInput) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Time Format",
        message: "Try formats like 7:30 AM, 07:30, or 0730",
      });
    }

    return (
      <List searchBarPlaceholder="Enter wake time (e.g., 7:30 AM)..." onSearchTextChange={handleSearchChange} throttle>
        <List.EmptyView
          icon={Icon.Clock}
          title="Enter a Wake Time"
          description="Type a time like 7:30 AM, 7am, 07:30, or 0730 to see optimal bedtimes"
        />
      </List>
    );
  }

  // Generate cycles: default 4 (6,5,4,3), extended adds 2 more (2,1)
  const baseCycles = [6, 5, 4, 3];
  const extendedCycles = showMoreUsed ? [2, 1] : [];
  const cycles = [...baseCycles, ...extendedCycles];

  const bedtimes = bedtimesForWake(parsed.hour, parsed.minute, parsed.ampm, FALL_ASLEEP_BUFFER, CYCLE_LENGTH, cycles);
  const wakeTimeFormatted = `${parsed.hour}:${parsed.minute.toString().padStart(2, "0")} ${parsed.ampm}`;

  // Sort by cycles descending (most sleep first)
  const sortedBedtimes = [...bedtimes].sort((a, b) => b.cycles - a.cycles);

  return (
    <List searchBarPlaceholder="Change wake time..." onSearchTextChange={handleSearchChange} throttle>
      <List.Section title={`Wake up at ${wakeTimeFormatted}`} subtitle={`+${FALL_ASLEEP_BUFFER} min to fall asleep`}>
        {sortedBedtimes.map((bedtime, index) => (
          <BedtimeItem key={index} bedtime={bedtime} />
        ))}
      </List.Section>

      {!showMoreUsed && (
        <List.Section>
          <List.Item
            icon={{ source: Icon.Plus, tintColor: Color.Purple }}
            title="Show More Bedtimes"
            subtitle="Add shorter sleep cycle options"
            accessories={[{ tag: "+2 more" }]}
            actions={
              <ActionPanel>
                <Action title="Show More Bedtimes" icon={Icon.Plus} onAction={handleShowMore} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function BedtimeItem({ bedtime }: { bedtime: SleepTime }) {
  const timeStr = formatTime(bedtime);
  const durationStr = formatDuration(bedtime.totalMinutes);
  const quality = getSleepQuality(bedtime.cycles);

  return (
    <List.Item
      icon={{
        source: quality.icon,
        tintColor: quality.color,
      }}
      title={timeStr}
      subtitle={`${bedtime.cycles} cycles · ${durationStr}`}
      accessories={[{ tag: { value: quality.label, color: quality.color } }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Time" content={timeStr} />
          <Action.CopyToClipboard
            title="Copy Details"
            content={`Go to bed at ${timeStr} (${bedtime.cycles} cycles, ${durationStr} of sleep)`}
          />
        </ActionPanel>
      }
    />
  );
}
