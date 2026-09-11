import { List, ActionPanel, Action, Icon, Color, showToast, Toast, LaunchProps } from "@raycast/api";
import { useState } from "react";
import {
  wakeTimesForSleep,
  formatTime,
  formatDuration,
  parseTimeInput,
  getSleepQuality,
  SleepTime,
  FALL_ASLEEP_BUFFER,
  CYCLE_LENGTH,
} from "./lib/sleep-utils";

interface Arguments {
  sleepAtTime: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const initialTime = props.arguments.sleepAtTime;
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
      <List searchBarPlaceholder="Enter sleep time (e.g., 7:30 AM)..." onSearchTextChange={handleSearchChange} throttle>
        <List.EmptyView
          icon={Icon.Clock}
          title="Enter a Sleep Time"
          description="Type a time like 7:30 AM, 7am, 07:30, or 0730 to see optimal wake times"
        />
      </List>
    );
  }

  // Generate cycles: default 4 (6,5,4,3), extended adds 2 more (2,1)
  const baseCycles = [6, 5, 4, 3];
  const extendedCycles = showMoreUsed ? [2, 1] : [];
  const cycles = [...baseCycles, ...extendedCycles];

  const wakeTimes = wakeTimesForSleep(
    parsed.hour,
    parsed.minute,
    parsed.ampm,
    FALL_ASLEEP_BUFFER,
    CYCLE_LENGTH,
    cycles,
  );
  const sleepTimeFormatted = `${parsed.hour}:${parsed.minute.toString().padStart(2, "0")} ${parsed.ampm}`;

  // Calculate fall asleep time
  const fallAsleepMinutes =
    ((parsed.hour % 12) + (parsed.ampm === "PM" ? 12 : 0)) * 60 + parsed.minute + FALL_ASLEEP_BUFFER;
  const fallAsleepHour24 = Math.floor(fallAsleepMinutes / 60) % 24;
  const fallAsleepMinute = fallAsleepMinutes % 60;
  const fallAsleepAmpm = fallAsleepHour24 >= 12 ? "PM" : "AM";
  let fallAsleepHour12 = fallAsleepHour24 % 12;
  if (fallAsleepHour12 === 0) fallAsleepHour12 = 12;
  const fallAsleepFormatted = `${fallAsleepHour12}:${fallAsleepMinute.toString().padStart(2, "0")} ${fallAsleepAmpm}`;

  // Sort by cycles descending (most sleep first)
  const sortedWakeTimes = [...wakeTimes].sort((a, b) => b.cycles - a.cycles);

  return (
    <List searchBarPlaceholder="Change sleep time..." onSearchTextChange={handleSearchChange} throttle>
      <List.Section title={`Sleep at ${sleepTimeFormatted}`} subtitle={`Asleep by ~${fallAsleepFormatted}`}>
        {sortedWakeTimes.map((wakeTime, index) => (
          <WakeTimeItem key={index} wakeTime={wakeTime} />
        ))}
      </List.Section>

      {!showMoreUsed && (
        <List.Section>
          <List.Item
            icon={{ source: Icon.Plus, tintColor: Color.Purple }}
            title="Show More Wake Times"
            subtitle="Add shorter sleep cycle options"
            accessories={[{ tag: "+2 more" }]}
            actions={
              <ActionPanel>
                <Action title="Show More Wake Times" icon={Icon.Plus} onAction={handleShowMore} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function WakeTimeItem({ wakeTime }: { wakeTime: SleepTime }) {
  const timeStr = formatTime(wakeTime);
  const durationStr = formatDuration(wakeTime.totalMinutes);
  const quality = getSleepQuality(wakeTime.cycles);

  return (
    <List.Item
      icon={{
        source: quality.icon,
        tintColor: quality.color,
      }}
      title={timeStr}
      subtitle={`${wakeTime.cycles} cycles · ${durationStr}`}
      accessories={[{ tag: { value: quality.label, color: quality.color } }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Time" content={timeStr} />
          <Action.CopyToClipboard
            title="Copy Details"
            content={`Wake up at ${timeStr} (${wakeTime.cycles} cycles, ${durationStr} of sleep)`}
          />
        </ActionPanel>
      }
    />
  );
}
