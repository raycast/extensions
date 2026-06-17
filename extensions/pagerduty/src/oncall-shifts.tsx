import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { addDays, differenceInHours, differenceInMinutes, format, isAfter, isBefore, parseISO } from "date-fns";
import { useEffect, useMemo } from "react";
import { GetMeResponse, ListOncallsResponse, OncallShift } from "./types";

const BASE_URL = "https://api.pagerduty.com";

export default function Command() {
  const { apiKey } = getPreferenceValues<{ apiKey: string }>();

  // Fetch current user
  const {
    data: userData,
    isLoading: isLoadingUser,
    error: userError,
  } = useFetch<GetMeResponse>(`${BASE_URL}/users/me`, {
    headers: {
      Accept: "application/vnd.pagerduty+json;version=2",
      Authorization: `Token token=${apiKey}`,
    },
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch user info",
        message: error.message,
      });
    },
  });

  const userId = userData?.user?.id;

  // Calculate date range (next 30 days) - memoized to prevent infinite re-renders
  const { now, sinceParam, untilParam } = useMemo(() => {
    const now = new Date();
    const until = addDays(now, 30);
    return {
      now,
      sinceParam: now.toISOString(),
      untilParam: until.toISOString(),
    };
  }, []);

  // Fetch oncall shifts for the user
  const {
    data: oncallData,
    isLoading: isLoadingOncalls,
    error: oncallError,
  } = useFetch<ListOncallsResponse>(
    userId
      ? `${BASE_URL}/oncalls?user_ids[]=${userId}&since=${sinceParam}&until=${untilParam}&include[]=escalation_policies&include[]=users`
      : "",
    {
      headers: {
        Accept: "application/vnd.pagerduty+json;version=2",
        Authorization: `Token token=${apiKey}`,
      },
      execute: !!userId,
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch oncall shifts",
          message: error.message,
        });
      },
    },
  );

  const isLoading = isLoadingUser || isLoadingOncalls;
  const error = userError || oncallError;

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message,
      });
    }
  }, [error]);

  // Group shifts by schedule
  const scheduleGroups = new Map<string, { schedule: string; shifts: OncallShift[] }>();

  oncallData?.oncalls?.forEach((shift) => {
    const scheduleKey = shift.schedule?.id || "no-schedule";
    const scheduleName = shift.schedule?.summary || "No Schedule";

    if (!scheduleGroups.has(scheduleKey)) {
      scheduleGroups.set(scheduleKey, { schedule: scheduleName, shifts: [] });
    }
    scheduleGroups.get(scheduleKey)!.shifts.push(shift);
  });

  // Separate current and upcoming schedule groups
  const currentSchedules: Array<{ schedule: string; shifts: OncallShift[] }> = [];
  const upcomingSchedules: Array<{ schedule: string; shifts: OncallShift[] }> = [];

  scheduleGroups.forEach((group) => {
    // Split shifts within this schedule into current and upcoming
    const currentShifts = group.shifts.filter((shift) => {
      const start = parseISO(shift.start);
      const end = parseISO(shift.end);
      return isBefore(start, now) && isAfter(end, now);
    });

    const upcomingShifts = group.shifts.filter((shift) => {
      const start = parseISO(shift.start);
      return isAfter(start, now);
    });

    // Add to current schedules if there are current shifts
    if (currentShifts.length > 0) {
      currentSchedules.push({ schedule: group.schedule, shifts: currentShifts });
    }

    // Add to upcoming schedules if there are upcoming shifts
    if (upcomingShifts.length > 0) {
      upcomingSchedules.push({ schedule: group.schedule, shifts: upcomingShifts });
    }
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter oncall shifts...">
      <List.Section
        title="🟢 Currently On Call"
        subtitle={`${currentSchedules.length} schedule${currentSchedules.length !== 1 ? "s" : ""}`}
      >
        {currentSchedules.map((group) => (
          <ScheduleShiftItem
            key={`current-${group.schedule}`}
            schedule={group.schedule}
            shifts={group.shifts}
            isCurrent={true}
          />
        ))}
      </List.Section>

      <List.Section
        title="📅 Upcoming Shifts (30 days)"
        subtitle={`${upcomingSchedules.length} schedule${upcomingSchedules.length !== 1 ? "s" : ""}`}
      >
        {upcomingSchedules.map((group) => (
          <ScheduleShiftItem
            key={`upcoming-${group.schedule}`}
            schedule={group.schedule}
            shifts={group.shifts}
            isCurrent={false}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ScheduleShiftItem({
  schedule,
  shifts,
  isCurrent,
}: {
  schedule: string;
  shifts: OncallShift[];
  isCurrent: boolean;
}) {
  const now = new Date();

  // Get time range from the first shift (they should have same schedule times)
  const firstShift = shifts[0];
  const start = parseISO(firstShift.start);
  const end = parseISO(firstShift.end);

  // Get all unique escalation policies
  const policies = [...new Set(shifts.map((s) => s.escalation_policy.summary))].join(", ");

  let subtitle: string;
  const accessories: List.Item.Accessory[] = [];

  if (isCurrent) {
    const remaining = formatDuration(now, end);
    subtitle = `Ends ${format(end, "MMM d, h:mm a")} (${remaining} remaining)`;
    accessories.push({
      text: policies,
      tooltip: `Escalation Policies: ${policies}`,
    });
  } else {
    subtitle = `${format(start, "MMM d, h:mm a")} → ${format(end, "MMM d, h:mm a")}`;
    accessories.push({
      text: policies,
      tooltip: `Escalation Policies: ${policies}`,
    });
  }

  return (
    <List.Item
      icon={isCurrent ? Icon.Circle : Icon.Clock}
      title={schedule}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          {shifts.map((shift) => (
            <Action.OpenInBrowser
              key={shift.escalation_policy.id}
              url={shift.escalation_policy.html_url}
              title={`Open ${shift.escalation_policy.summary}`}
            />
          ))}
          <Action.CopyToClipboard
            title="Copy Shift Details"
            content={formatScheduleShiftDetails(schedule, shifts, start, end)}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

function formatDuration(from: Date, to: Date): string {
  const hours = differenceInHours(to, from);
  const minutes = differenceInMinutes(to, from) % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) {
      return `${days}d`;
    }
    return `${days}d ${remainingHours}h`;
  }

  if (hours > 0) {
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatScheduleShiftDetails(schedule: string, shifts: OncallShift[], start: Date, end: Date): string {
  const policies = shifts.map((s) => s.escalation_policy.summary).join(", ");

  return `Schedule: ${schedule}
Escalation Policies: ${policies}
Start: ${format(start, "PPpp")}
End: ${format(end, "PPpp")}`;
}
