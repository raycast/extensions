import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchType,
  List,
  launchCommand,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import React, { useEffect, useState } from "react";
import { buildLeaveStatus, formatRemainingLabel } from "./lib/leave-status";
import { getWorkPreferences } from "./lib/preferences";
import {
  clearTodayStartTime,
  getTodayStartTime,
  setTodayStartTime,
} from "./lib/storage";
import { calculateLeaveTime, formatTimeString } from "./lib/time-utils";

// Get current time in HH:MM format
const getCurrentTimeString = () => {
  const now = new Date();
  return formatTimeString(now.getHours(), now.getMinutes());
};

// Generate once outside component (performance optimization)
const START_TIMES = (() => {
  const times: string[] = [];
  for (let h = 7; h <= 13; h++) {
    for (const m of [0, 15, 30, 45]) {
      times.push(formatTimeString(h, m));
    }
  }
  return times;
})();

async function refreshTopCommandSubtitle() {
  try {
    await launchCommand({
      name: "calculate-leave-time",
      type: LaunchType.Background,
    });
  } catch (err) {
    await showFailureToast(
      `Failed to refresh menu subtitle: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export default function Command() {
  const { workHours, breakMinutes } = getWorkPreferences();

  const [todayStart, setTodayStart] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    getTodayStartTime().then((time) => {
      setTodayStart(time);
      setIsLoading(false);
    });
  }, []);

  // Current time (updated every minute — display is HH:MM precision)
  const [currentTime, setCurrentTime] = useState(getCurrentTimeString);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeString());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = async (startTime: string) => {
    await setTodayStartTime(startTime);
    setTodayStart(startTime);
    await refreshTopCommandSubtitle();
  };

  const handleClear = async () => {
    await clearTodayStartTime();
    setTodayStart(null);
    await refreshTopCommandSubtitle();
  };

  // Parse custom time (formats: 9:21 or 09:21)
  const parseCustomTime = (input: string): string | null => {
    const match = input.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return formatTimeString(h, m);
  };

  const customTime = parseCustomTime(searchText);

  // Calculate today's leave time and remaining time
  const todayStatus = todayStart
    ? buildLeaveStatus(todayStart, workHours, breakMinutes, currentTime)
    : null;
  const leaveTime = todayStatus?.leaveTime ?? null;
  const remaining = todayStatus?.remaining ?? null;

  const filteredTimes = searchText
    ? START_TIMES.filter((time) => time.includes(searchText))
    : START_TIMES;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter time (e.g., 9:21)"
      onSearchTextChange={setSearchText}
    >
      {/* Today's schedule (if set) */}
      {todayStart && leaveTime && remaining && (
        <List.Section title="📅 Today">
          <List.Item
            key={`today-${currentTime}`}
            title={`🏠 Leave at ${leaveTime}`}
            subtitle={formatRemainingLabel(remaining)}
            icon={{
              source: Icon.Clock,
              tintColor: remaining.isPast ? Color.Orange : Color.Blue,
            }}
            accessories={[
              { tag: { value: todayStart, color: Color.SecondaryText } },
              {
                tag: {
                  value: `Work ${workHours}h Break ${breakMinutes}m`,
                  color: Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={leaveTime} />
                <Action
                  title="Reset"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={handleClear}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Start now (current time) */}
      {!searchText && (
        <List.Section title="🚀 Start Now">
          <List.Item
            title={`Now (${currentTime})`}
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            accessories={[
              {
                text: `→ ${calculateLeaveTime(currentTime, workHours, breakMinutes)}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  icon={Icon.Check}
                  onAction={() => handleSelect(currentTime)}
                />
                <Action.CopyToClipboard
                  title="Copy Leave Time"
                  content={calculateLeaveTime(
                    currentTime,
                    workHours,
                    breakMinutes,
                  )}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Custom time (if valid input) */}
      {customTime && !START_TIMES.includes(customTime) && (
        <List.Section title="✏️ Custom Time">
          <List.Item
            title={customTime}
            icon={{ source: Icon.Plus, tintColor: Color.Orange }}
            accessories={[
              {
                text: `→ ${calculateLeaveTime(customTime, workHours, breakMinutes)}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  icon={Icon.Check}
                  onAction={() => handleSelect(customTime)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Select start time */}
      <List.Section title="⏰ Select Start Time">
        {filteredTimes.map((time) => {
          const leave = calculateLeaveTime(time, workHours, breakMinutes);
          const rem = buildLeaveStatus(
            time,
            workHours,
            breakMinutes,
            currentTime,
          ).remaining;
          const isSelected = time === todayStart;

          return (
            <List.Item
              key={time}
              title={time}
              icon={
                isSelected
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : Icon.Circle
              }
              accessories={[
                { text: `→ ${leave}` },
                { tag: rem.isPast ? "✓" : formatRemainingLabel(rem) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Select"
                    icon={Icon.Check}
                    onAction={() => handleSelect(time)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Leave Time"
                    content={leave}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
