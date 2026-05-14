import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import {
  wakeTimesForSleep,
  formatTime,
  formatDuration,
  getCurrentTime,
  parseTimeInput,
  getSleepQuality,
  SleepTime,
  FALL_ASLEEP_BUFFER,
  CYCLE_LENGTH,
} from "./lib/sleep-utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [showMoreUsed, setShowMoreUsed] = useState(false);

  // Use search text if provided, otherwise use current time
  const currentTime = getCurrentTime();
  const defaultTimeFormatted = formatTime(currentTime);

  let sleepTime = currentTime;
  let sleepTimeFormatted = defaultTimeFormatted;
  let usingCustomTime = false;

  if (searchText.trim()) {
    const parsed = parseTimeInput(searchText);
    if (parsed) {
      sleepTime = parsed;
      sleepTimeFormatted = `${parsed.hour}:${parsed.minute.toString().padStart(2, "0")} ${parsed.ampm}`;
      usingCustomTime = true;
    }
  }

  const handleShowMore = () => {
    setShowMoreUsed(true);
    showToast({
      style: Toast.Style.Success,
      title: "Showing More Options",
    });
  };

  // Generate cycles: default 4 (6,5,4,3), extended adds 2 more (2,1)
  const baseCycles = [6, 5, 4, 3];
  const extendedCycles = showMoreUsed ? [2, 1] : [];
  const cycles = [...baseCycles, ...extendedCycles];

  const wakeTimes = wakeTimesForSleep(
    sleepTime.hour,
    sleepTime.minute,
    sleepTime.ampm,
    FALL_ASLEEP_BUFFER,
    CYCLE_LENGTH,
    cycles,
  );

  // Calculate fall asleep time
  const fallAsleepMinutes =
    ((sleepTime.hour % 12) + (sleepTime.ampm === "PM" ? 12 : 0)) * 60 + sleepTime.minute + FALL_ASLEEP_BUFFER;
  const fallAsleepHour24 = Math.floor(fallAsleepMinutes / 60) % 24;
  const fallAsleepMinute = fallAsleepMinutes % 60;
  const fallAsleepAmpm = fallAsleepHour24 >= 12 ? "PM" : "AM";
  let fallAsleepHour12 = fallAsleepHour24 % 12;
  if (fallAsleepHour12 === 0) fallAsleepHour12 = 12;
  const fallAsleepFormatted = `${fallAsleepHour12}:${fallAsleepMinute.toString().padStart(2, "0")} ${fallAsleepAmpm}`;

  // Sort by cycles descending (best sleep first)
  const sortedWakeTimes = [...wakeTimes].sort((a, b) => b.cycles - a.cycles);

  const sectionTitle = usingCustomTime
    ? `Going to bed at ${sleepTimeFormatted}`
    : `Going to bed now (${sleepTimeFormatted})`;

  return (
    <List searchBarPlaceholder="Enter bedtime or leave blank for now..." onSearchTextChange={setSearchText} throttle>
      <List.Section title={sectionTitle} subtitle={`Asleep by ~${fallAsleepFormatted}`}>
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
