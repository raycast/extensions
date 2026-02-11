import { Grid, ActionPanel, Action, Icon, environment, Detail, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchWorklogsReport, Worklog, fetchAssignedTickets } from "./api/jira-client";
import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
  startOfWeek,
  isSameMonth,
  addDays,
  isToday,
  getDay,
} from "date-fns";
import LogWorkForm from "./components/LogWorkForm";
import WorkDaysForm from "./components/WorkDaysForm";

interface Preferences {
  workDays?: string;
}

function getCalendarIcon(
  text: string,
  hours: string,
  hasWork: boolean,
  isCurrentMonth: boolean,
  day: Date,
  isWorkDay: boolean,
  isHeader = false
) {
  const isLight = environment.theme === "light";
  const accentColor = isLight ? "#007AFF" : "#0A84FF";
  const strokeColor = isLight ? "#E5E5E5" : "#333333";

  // Fading logic: Non-current month + Non-work days receive heavier fading
  const monthOpacity = isCurrentMonth ? 1 : 0.25;
  const workDayOpacity = isWorkDay ? 1 : 0.15;
  const opacity = monthOpacity * workDayOpacity;

  const isTodayDate = isToday(day);

  if (isHeader) {
    return `data:image/svg+xml;base64,${Buffer.from(
      `
        <svg width="150" height="40" viewBox="0 0 150 40" xmlns="http://www.w3.org/2000/svg">
          <text x="75" y="28" text-anchor="middle" font-size="16" font-family="sans-serif" font-weight="600" fill="${isLight ? "#8E8E93" : "#98989D"}">${text}</text>
        </svg>
      `
    ).toString("base64")}`;
  }

  const svg = `
    <svg width="150" height="100" viewBox="0 0 150 100" xmlns="http://www.w3.org/2000/svg">
      <!-- Grid Border -->
      <rect x="0" y="0" width="150" height="100" fill="none" stroke="${strokeColor}" stroke-width="1"/>
      
      <!-- Today Highlight -->
      ${
        isTodayDate
          ? `
        <circle cx="28" cy="28" r="18" fill="${accentColor}"/>
        <text x="28" y="34" text-anchor="middle" font-size="18" font-family="sans-serif" font-weight="700" fill="#FFFFFF">${text}</text>
      `
          : `
        <text x="28" y="34" text-anchor="middle" font-size="18" font-family="sans-serif" font-weight="${isCurrentMonth ? "500" : "400"}" fill="${isCurrentMonth ? (isLight ? "#000000" : "#FFFFFF") : isLight ? "#C7C7CC" : "#48484A"}" fill-opacity="${opacity}">${text}</text>
      `
      }

      <!-- Hours Display (Large & Clear) -->
      ${
        hasWork
          ? `
        <rect x="15" y="55" width="120" height="32" rx="16" fill="${accentColor}" fill-opacity="${isWorkDay ? "0.15" : "0.05"}"/>
        <text x="75" y="78" text-anchor="middle" font-size="20" font-family="sans-serif" font-weight="800" fill="${accentColor}" fill-opacity="${opacity}">${hours}h</text>
      `
          : ""
      }
    </svg>
  `;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default function WorklogReport() {
  const preferences = getPreferenceValues<Preferences>();
  const [viewDate, setViewDate] = useState(new Date());

  const { data: storedWorkDays, revalidate: revalidateWorkDays } = useCachedPromise(async () => {
    const item = await LocalStorage.getItem<string>("workDays");
    if (item) {
      try {
        return JSON.parse(item) as string[];
      } catch (e) {
        console.error("Failed to parse workDays from LocalStorage", e);
        return (
          preferences.workDays
            ?.split(",")
            .map((s) => s.trim())
            .filter(Boolean) || ["1", "2", "3", "4", "5"]
        );
      }
    }
    return (
      preferences.workDays
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || ["1", "2", "3", "4", "5"]
    );
  }, []);

  const workDays = storedWorkDays || ["1", "2", "3", "4", "5"];

  const startDate = format(startOfMonth(viewDate), "yyyy-MM-dd");
  const endDate = format(endOfMonth(viewDate), "yyyy-MM-dd");

  const {
    data: worklogs,
    isLoading: isLoadingWorklogs,
    revalidate: revalidateWorklogs,
  } = useCachedPromise((start: string, end: string) => fetchWorklogsReport(start, end), [startDate, endDate]);

  const { data: issues, isLoading: isLoadingIssues } = useCachedPromise(() => fetchAssignedTickets(), []);

  const firstDay = startOfMonth(viewDate);
  const calendarStart = startOfWeek(firstDay, { weekStartsOn: 0 });
  const calendarDays = Array.from({ length: 42 }).map((_, i) => addDays(calendarStart, i));
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  const getDayWorklogs = (day: Date) => {
    return worklogs?.filter((wl) => isSameDay(parseISO(wl.started), day)) || [];
  };

  const getDayTotalHours = (day: Date) => {
    const dayWorklogs = getDayWorklogs(day);
    const seconds = dayWorklogs.reduce((acc, wl) => acc + wl.timeSpentSeconds, 0);
    return (seconds / 3600).toFixed(1);
  };

  return (
    <Grid
      isLoading={isLoadingWorklogs || isLoadingIssues}
      columns={7}
      aspectRatio="3/2"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      searchBarPlaceholder="Filter days..."
      navigationTitle={`Worklog: ${format(viewDate, "MMMM yyyy")}`}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Month"
          onChange={(newValue) => {
            if (newValue === "prev") setViewDate(subMonths(viewDate, 1));
            if (newValue === "next") setViewDate(addMonths(viewDate, 1));
          }}
        >
          <Grid.Dropdown.Item title={`${format(viewDate, "MMMM yyyy")}`} value="current" />
          <Grid.Dropdown.Item title="Previous Month" value="prev" />
          <Grid.Dropdown.Item title="Next Month" value="next" />
        </Grid.Dropdown>
      }
    >
      <Grid.Section title="">
        {weekdays.map((day, idx) => (
          <Grid.Item
            key={`header-${idx}`}
            content={{
              source: getCalendarIcon(day, "", false, true, new Date(), true, true),
            }}
            title=""
            actions={
              <ActionPanel>
                <Action.Push
                  title="Configure Work Days"
                  icon={Icon.Calendar}
                  target={<WorkDaysForm initialDays={workDays} onDone={revalidateWorkDays} />}
                />
              </ActionPanel>
            }
          />
        ))}
        {calendarDays.map((day) => {
          const isDayInCurrentMonth = isSameMonth(day, viewDate);
          const dayWorklogs = getDayWorklogs(day);
          const totalHours = getDayTotalHours(day);
          const hasWork = parseFloat(totalHours) > 0;
          const isWorkDay = workDays.includes(getDay(day).toString());

          const icon = getCalendarIcon(format(day, "d"), totalHours, hasWork, isDayInCurrentMonth, day, isWorkDay);

          return (
            <Grid.Item
              key={day.toISOString()}
              content={{ source: icon }}
              title=""
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Log Work"
                    icon={Icon.Plus}
                    target={<LogWorkForm availableIssues={issues} initialDate={day} onDone={revalidateWorklogs} />}
                  />
                  <Action.Push
                    title="Edit Work Days"
                    icon={Icon.Calendar}
                    shortcut={{ modifiers: ["cmd"], key: "w" }}
                    target={<WorkDaysForm initialDays={workDays} onDone={revalidateWorkDays} />}
                  />
                  {dayWorklogs.length > 0 && (
                    <Action.Push
                      title="View Day Details"
                      icon={Icon.MagnifyingGlass}
                      target={<DayDetailView day={day} worklogs={dayWorklogs} />}
                    />
                  )}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => {
                      revalidateWorklogs();
                      revalidateWorkDays();
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </Grid.Section>
    </Grid>
  );
}

function DayDetailView({ day, worklogs }: { day: Date; worklogs: Worklog[] }) {
  return (
    <Grid itemSize={Grid.ItemSize.Large} navigationTitle={`Details for ${format(day, "PPP")}`}>
      {worklogs.map((wl) => (
        <Grid.Item
          key={wl.id}
          title={wl.issueKey}
          subtitle={wl.timeSpent}
          content={Icon.Clock}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Markdown"
                target={
                  <Detail
                    markdown={`### ${wl.issueKey}: ${wl.issueSummary}\n\n**Time Spent:** ${wl.timeSpent}\n\n**Comment:**\n${wl.comment || "_No comment provided_"}`}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
