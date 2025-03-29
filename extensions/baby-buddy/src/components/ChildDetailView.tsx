import { ActionPanel, Action, Detail, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { BabyBuddyAPI } from "../api";
import { Child, FeedingEntry, SleepEntry, DiaperEntry, TummyTimeEntry } from "../api";
import {
  formatPreciseTimeAgo, // Import the new function
  formatMinutesToFullDuration,
  formatDiaperDescription,
  formatErrorMessage,
} from "../utils";
import {
  calculateTotalFeedingAmount,
  calculateTotalSleepMinutes,
  calculateTotalTummyTimeMinutes,
  countWetDiapers,
  countSolidDiapers,
  calculateTotalDiaperAmount,
  calculateAge,
} from "../utils/statistics";
import { getTodayDateRange } from "../utils/date-helpers";
import FeedingList from "./FeedingList";
import SleepList from "./SleepList";
import DiaperList from "./DiaperList";
import TummyTimeList from "./TummyTimeList";
import { showFailureToast } from "@raycast/utils";

interface ChildDetailViewProps {
  child: Child;
}

interface ChildStats {
  lastFeeding: FeedingEntry | null;
  lastSleep: SleepEntry | null;
  lastDiaper: DiaperEntry | null;
  lastTummyTime: TummyTimeEntry | null;
  todayFeedings: FeedingEntry[];
  todaySleep: SleepEntry[];
  todayDiapers: DiaperEntry[];
  todayTummyTime: TummyTimeEntry[];
}

export default function ChildDetailView({ child }: ChildDetailViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ChildStats>({
    lastFeeding: null,
    lastSleep: null,
    lastDiaper: null,
    lastTummyTime: null,
    todayFeedings: [],
    todaySleep: [],
    todayDiapers: [],
    todayTummyTime: [],
  });

  const navigation = useNavigation();

  useEffect(() => {
    async function fetchChildStats() {
      try {
        setIsLoading(true);
        const api = new BabyBuddyAPI();

        // Fetch the latest entries for each activity
        const lastFeeding = await api.getLastFeeding(child.id);
        const lastSleep = await api.getLastSleep(child.id);
        const lastDiaper = await api.getLastDiaper(child.id);
        const lastTummyTime = await api.getLastTummyTime(child.id);

        // Fetch today's entries for each activity
        const allFeedings = await api.getTodayFeedings(child.id);
        const allSleep = await api.getTodaySleep(child.id);
        const allDiapers = await api.getTodayDiapers(child.id);
        const allTummyTime = await api.getTodayTummyTime(child.id);

        // Filter activities to only include today's data
        const { start: todayStart, end: todayEnd } = getTodayDateRange();

        const todayFeedings = allFeedings.filter((feeding) => new Date(feeding.start) >= todayStart);
        const todaySleep = allSleep.filter((sleep) => new Date(sleep.end) >= todayStart);
        const todayDiapers = allDiapers.filter((diaper) => new Date(diaper.time) >= todayStart);
        const todayTummyTime = allTummyTime.filter((tummyTime) => {
          const tummyTimeEndDate = new Date(tummyTime.end);
          return tummyTimeEndDate >= todayStart && tummyTimeEndDate < todayEnd;
        });

        setStats({
          lastFeeding,
          lastSleep,
          lastDiaper,
          lastTummyTime,
          todayFeedings,
          todaySleep,
          todayDiapers,
          todayTummyTime,
        });

        setIsLoading(false);
      } catch (error) {
        showFailureToast("Failed to fetch child stats", { message: formatErrorMessage(error) });
        setIsLoading(false);
      }
    }

    fetchChildStats();
  }, [child.id]);

  // Calculate total feeding amount for today
  const totalFeedingAmount = calculateTotalFeedingAmount(stats.todayFeedings);

  // Calculate total sleep duration for today (in minutes)
  const totalSleepMinutes = calculateTotalSleepMinutes(stats.todaySleep);

  // Calculate total tummy time duration for today (in minutes)
  const totalTummyTimeMinutes = calculateTotalTummyTimeMinutes(stats.todayTummyTime);

  // Count wet and solid diapers
  const wetDiapers = countWetDiapers(stats.todayDiapers);
  const solidDiapers = countSolidDiapers(stats.todayDiapers);

  // Calculate total diaper amount
  const totalDiaperAmount = calculateTotalDiaperAmount(stats.todayDiapers);

  const markdown = `
# ${child.first_name} ${child.last_name}

## Feeding
${
  stats.lastFeeding
    ? `Last feeding: **${formatPreciseTimeAgo(stats.lastFeeding.start)}** (${stats.lastFeeding.type}, ${stats.lastFeeding.method}${stats.lastFeeding.amount ? `, ${stats.lastFeeding.amount}` : ""})`
    : "No recent feedings recorded"
}
  
Total today: **${totalFeedingAmount.toFixed(1)}**

## Sleep
${
  stats.lastSleep
    ? `Last sleep: **${formatPreciseTimeAgo(stats.lastSleep.end)}** (${stats.lastSleep.duration})`
    : "No recent sleep recorded"
}
  
Total today: **${formatMinutesToFullDuration(totalSleepMinutes)}**

## Diaper Changes
${
  stats.lastDiaper
    ? `Last change: **${formatPreciseTimeAgo(stats.lastDiaper.time)}** (${formatDiaperDescription(stats.lastDiaper)})`
    : "No recent diaper changes recorded"
}
  
Total today: **${stats.todayDiapers.length}** changes (${wetDiapers} wet, ${solidDiapers} solid${totalDiaperAmount > 0 ? `, ${totalDiaperAmount.toFixed(1)} amount` : ""})

## Tummy Time
${
  stats.lastTummyTime
    ? `Last tummy time: **${formatPreciseTimeAgo(stats.lastTummyTime.end)}** (${stats.lastTummyTime.duration})`
    : "No recent tummy time recorded"
}
  
Total today: **${formatMinutesToFullDuration(totalTummyTimeMinutes)}**
`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Feedings"
            icon={Icon.Mug}
            target={<FeedingList child={child} />}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
          />
          <Action.Push
            title="View Sleep"
            icon={Icon.Moon}
            target={<SleepList child={child} />}
            shortcut={{ modifiers: ["cmd"], key: "2" }}
          />
          <Action.Push
            title="View Diaper Changes"
            icon={Icon.Bubble}
            target={<DiaperList child={child} />}
            shortcut={{ modifiers: ["cmd"], key: "3" }}
          />
          <Action.Push
            title="View Tummy Time"
            icon={Icon.Star}
            target={<TummyTimeList child={child} />}
            shortcut={{ modifiers: ["cmd"], key: "4" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Age" text={calculateAge(child.birth_date)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Today's Feedings"
            text={`${stats.todayFeedings.length} (${totalFeedingAmount.toFixed(1)})`}
          />
          <Detail.Metadata.Label title="Today's Sleep" text={formatMinutesToFullDuration(totalSleepMinutes)} />
          <Detail.Metadata.Label
            title="Today's Diapers"
            text={`${stats.todayDiapers.length} (${wetDiapers} wet, ${solidDiapers} solid${totalDiaperAmount > 0 ? `, ${totalDiaperAmount.toFixed(1)} amount` : ""})`}
          />
          <Detail.Metadata.Label title="Today's Tummy Time" text={formatMinutesToFullDuration(totalTummyTimeMinutes)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Quick Actions">
            <Detail.Metadata.TagList.Item
              text="Feedings"
              icon={Icon.Mug}
              onAction={() => navigation.push(<FeedingList child={child} />)}
            />
            <Detail.Metadata.TagList.Item
              text="Sleep"
              icon={Icon.Moon}
              onAction={() => navigation.push(<SleepList child={child} />)}
            />
            <Detail.Metadata.TagList.Item
              text="Diapers"
              icon={Icon.Bubble}
              onAction={() => navigation.push(<DiaperList child={child} />)}
            />
            <Detail.Metadata.TagList.Item
              text="Tummy Time"
              icon={Icon.Star}
              onAction={() => navigation.push(<TummyTimeList child={child} />)}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      navigationTitle={`${child.first_name} Details`}
    />
  );
}
