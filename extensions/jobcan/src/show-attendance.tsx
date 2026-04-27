import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Grid,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { fetchAttendanceMonth, getModifyUrl, submitAttendanceDay, submitAttendanceDays } from "./jobcan";
import type { AttendanceDay, AttendanceStatus } from "./types";

type Preferences = {
  username: string;
  password: string;
  defaultStartTime: string;
  defaultEndTime: string;
  defaultNotice?: string;
};

const FALLBACK_NOTICE = "手続き";

type DisplayStatus = AttendanceStatus | "dayOff" | "weekend" | "nationalHoliday" | "refresh" | "trip" | "newYearLeave";

const statusStyles: Record<DisplayStatus, { icon: Icon; color: Color; label: string }> = {
  complete: { icon: Icon.CheckCircle, color: Color.Green, label: "Logged" },
  partial: { icon: Icon.Clock, color: Color.Yellow, label: "Partial" },
  pending: { icon: Icon.Hourglass, color: Color.Yellow, label: "Pending" },
  absent: { icon: Icon.XMarkCircle, color: Color.Red, label: "Absent" },
  late: { icon: Icon.ExclamationMark, color: Color.Orange, label: "Today" },
  holiday: { icon: Icon.Calendar, color: Color.Blue, label: "Day off" },
  dayOff: { icon: Icon.Umbrella, color: Color.Blue, label: "Day off" },
  weekend: { icon: Icon.Moon, color: Color.Purple, label: "Weekend" },
  nationalHoliday: { icon: Icon.Calendar, color: Color.Magenta, label: "Holiday" },
  refresh: { icon: Icon.Calendar, color: Color.Blue, label: "Refresh" },
  trip: { icon: Icon.Calendar, color: Color.Blue, label: "Trip" },
  newYearLeave: { icon: Icon.Calendar, color: Color.Blue, label: "NY Leave" },
  empty: { icon: Icon.Circle, color: Color.SecondaryText, label: "Empty" },
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const monthOptions = useMemo(getMonthOptions, []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);
  const { data, error, isLoading, revalidate } = usePromise(fetchAttendanceMonth, [
    {
      username: preferences.username,
      password: preferences.password,
      year: selectedMonth.year,
      month: selectedMonth.month,
    },
  ]);

  const days = data?.days ?? [];

  return (
    <Grid
      columns={7}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      searchBarPlaceholder="Search days, statuses, or holidays"
      navigationTitle={data ? `${data.year}-${String(data.month).padStart(2, "0")} Attendance` : "Attendance"}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Month"
          value={selectedMonth.value}
          onChange={(value) => {
            const option = monthOptions.find((monthOption) => monthOption.value === value);
            if (option) setSelectedMonth(option);
          }}
        >
          {monthOptions.map((option) => (
            <Grid.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </Grid.Dropdown>
      }
    >
      {error ? (
        <Grid.EmptyView title="Could Not Load Attendance" description={error.message} icon={Icon.Warning} />
      ) : (
        days.map((day) => (
          <AttendanceGridItem
            key={day.day}
            day={day}
            monthDays={days}
            preferences={preferences}
            onRefresh={revalidate}
          />
        ))
      )}
    </Grid>
  );
}

function getMonthOptions() {
  const today = new Date();
  const months = [0, 1, 2, 3].map((monthOffset) => new Date(today.getFullYear(), today.getMonth() - monthOffset, 1));

  return months.map((date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const value = `${year}-${String(month).padStart(2, "0")}`;

    return {
      value,
      year,
      month,
      title: value,
    };
  });
}

function AttendanceGridItem({
  day,
  monthDays,
  preferences,
  onRefresh,
}: {
  day: AttendanceDay;
  monthDays: AttendanceDay[];
  preferences: Preferences;
  onRefresh: () => void;
}) {
  const displayStatus = getDisplayStatus(day);
  const style = statusStyles[displayStatus];
  const canSubmitDay = day.status === "absent" || day.status === "late";
  const absentDays = monthDays.filter((monthDay) => monthDay.status === "absent");
  return (
    <Grid.Item
      content={{ value: { source: style.icon, tintColor: style.color }, tooltip: style.label }}
      title={`${day.day} - ${style.label}`}
      keywords={[day.weekday, day.statusText, day.holidayType, style.label]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {canSubmitDay ? (
              <Action
                title="Submit"
                icon={Icon.Upload}
                onAction={() => submitDayAndRefresh(day, preferences, onRefresh)}
              />
            ) : null}
            {canSubmitDay && absentDays.length ? (
              <Action
                title={`Submit All (${absentDays.length})`}
                icon={Icon.Upload}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={() => submitAllAndRefresh(absentDays, preferences, onRefresh)}
              />
            ) : null}
            <Action.OpenInBrowser
              title="Open Day on Jobcan"
              url={getModifyUrl(day.date.getFullYear(), day.date.getMonth() + 1, day.day)}
            />
            <Action.OpenInBrowser
              title="Open Month on Jobcan"
              url={getAttendanceMonthUrl(day.date.getFullYear(), day.date.getMonth() + 1)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getAttendanceMonthUrl(year: number, month: number): string {
  const url = new URL("https://ssl.jobcan.jp/employee/attendance");
  url.searchParams.set("list_type", "normal");
  url.searchParams.set("search_type", "month");
  url.searchParams.set("year", String(year));
  url.searchParams.set("month", String(month));
  return url.toString();
}

async function submitDayAndRefresh(day: AttendanceDay, preferences: Preferences, onRefresh: () => void) {
  const notice = getDefaultNotice(preferences);
  const confirmed = await confirmAlert({
    title: `Submit ${day.day} - ${statusStyles[getDisplayStatus(day)].label}?`,
    message: `This will request ${preferences.defaultStartTime} and ${preferences.defaultEndTime} with note "${notice}".`,
    primaryAction: {
      title: "Submit",
      style: Alert.ActionStyle.Default,
    },
  });

  if (!confirmed) return;

  const toast = await showToast({ style: Toast.Style.Animated, title: `Submitting ${day.day}` });
  try {
    await submitAttendanceDay({
      username: preferences.username,
      password: preferences.password,
      year: day.date.getFullYear(),
      month: day.date.getMonth() + 1,
      day: day.day,
      startTime: preferences.defaultStartTime,
      endTime: preferences.defaultEndTime,
      notice,
    });
    toast.style = Toast.Style.Success;
    toast.title = `Submitted ${day.day}`;
    onRefresh();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not submit ${day.day}`;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function submitAllAndRefresh(days: AttendanceDay[], preferences: Preferences, onRefresh: () => void) {
  const notice = getDefaultNotice(preferences);
  const confirmed = await confirmAlert({
    title: `Submit ${days.length} absent days?`,
    message: `This will request ${preferences.defaultStartTime} and ${preferences.defaultEndTime} with note "${notice}" for each absent day in this month.`,
    primaryAction: {
      title: "Submit All",
      style: Alert.ActionStyle.Default,
    },
  });

  if (!confirmed) return;

  const toast = await showToast({ style: Toast.Style.Animated, title: `Submitting ${days.length} days` });
  try {
    await submitAttendanceDays({
      username: preferences.username,
      password: preferences.password,
      days: days.map((day) => ({
        year: day.date.getFullYear(),
        month: day.date.getMonth() + 1,
        day: day.day,
      })),
      startTime: preferences.defaultStartTime,
      endTime: preferences.defaultEndTime,
      notice,
    });
    toast.style = Toast.Style.Success;
    toast.title = `Submitted ${days.length} days`;
    onRefresh();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not submit all days";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function getDefaultNotice(preferences: Preferences): string {
  return preferences.defaultNotice?.trim() || FALLBACK_NOTICE;
}

function getDisplayStatus(day: AttendanceDay): DisplayStatus {
  const labels = `${day.holidayType} ${day.statusText}`;

  if (day.weekday === "土" || day.weekday === "日") return "weekend";
  if (labels.includes("祝日")) return "nationalHoliday";
  if (labels.includes("リ休")) return "refresh";
  if (labels.includes("社旅")) return "trip";
  if (labels.includes("年末")) return "newYearLeave";
  if (!day.clockIn && !day.clockOut && day.holidayType) return "dayOff";
  return day.status;
}
