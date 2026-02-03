import { Action, ActionPanel, List, Icon, Color, Form, useNavigation, LocalStorage } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { getCalendarsWithColors, getCalendarEvents } from "./calendar";
import { formatDuration } from "./utils";
import { CalendarEvent, CalendarStats, CalendarInfo } from "./types";

const SELECTED_CALENDARS_KEY = "report-selected-calendars";

// Predefined time range options
type TimeRangeOption = "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

interface TimeRange {
  label: string;
  getRange: () => { start: Date; end: Date };
}

const TIME_RANGES: Record<TimeRangeOption, TimeRange> = {
  today: {
    label: "Today",
    getRange: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
  },
  yesterday: {
    label: "Yesterday",
    getRange: () => {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
  },
  thisWeek: {
    label: "This Week",
    getRange: () => {
      const start = new Date();
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday as first day
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
  },
  lastWeek: {
    label: "Last Week",
    getRange: () => {
      const start = new Date();
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1) - 7;
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
  },
  thisMonth: {
    label: "This Month",
    getRange: () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
  },
  lastMonth: {
    label: "Last Month",
    getRange: () => {
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
  },
  custom: {
    label: "Custom Range",
    getRange: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    },
  },
};

export default function TaskReport() {
  const { push } = useNavigation();

  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Build a map from calendar id to CalendarInfo for quick lookup
  const calendarInfoMap = useMemo(() => {
    const map = new Map<string, CalendarInfo>();
    for (const cal of calendars) {
      map.set(cal.id, cal);
    }
    return map;
  }, [calendars]);

  useEffect(() => {
    let cancelled = false;

    async function loadCalendars() {
      const calendarList = await getCalendarsWithColors();

      if (cancelled) return;

      setCalendars(calendarList);

      const ids = calendarList.map((c) => c.id);

      // Load saved selection from storage (now stores ids)
      const savedSelection = await LocalStorage.getItem<string>(SELECTED_CALENDARS_KEY);
      if (savedSelection) {
        try {
          const parsed = JSON.parse(savedSelection) as string[];
          // Filter to only include calendars that still exist (by id)
          const validSelection = parsed.filter((id) => ids.includes(id));
          setSelectedCalendarIds(validSelection.length > 0 ? validSelection : ids);
        } catch (error) {
          console.error("Failed to parse saved calendar selection, using defaults:", error);
          setSelectedCalendarIds(ids);
        }
      } else {
        setSelectedCalendarIds(ids); // Select all by default on first use
      }

      setIsLoading(false);
    }

    loadCalendars();

    return () => {
      cancelled = true;
    };
  }, []);

  // Save selection to storage whenever it changes
  useEffect(() => {
    if (calendars.length > 0 && !isLoading) {
      LocalStorage.setItem(SELECTED_CALENDARS_KEY, JSON.stringify(selectedCalendarIds));
    }
  }, [selectedCalendarIds, calendars, isLoading]);

  function toggleCalendar(id: string) {
    setSelectedCalendarIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelectedCalendarIds(calendars.map((c) => c.id));
  }

  function selectNone() {
    setSelectedCalendarIds([]);
  }

  function handleGenerateReport(timeRange: TimeRangeOption, customStart?: Date, customEnd?: Date) {
    let startDate: Date;
    let endDate: Date;

    if (timeRange === "custom" && customStart && customEnd) {
      startDate = customStart;
      startDate.setHours(0, 0, 0, 0);
      endDate = customEnd;
      endDate.setHours(23, 59, 59, 999);
    } else {
      const range = TIME_RANGES[timeRange].getRange();
      startDate = range.start;
      endDate = range.end;
    }

    push(
      <ReportView
        selectedCalendarIds={selectedCalendarIds}
        calendarInfoMap={calendarInfoMap}
        startDate={startDate}
        endDate={endDate}
        timeRangeLabel={
          timeRange === "custom"
            ? `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
            : TIME_RANGES[timeRange].label
        }
      />,
    );
  }

  return (
    <CalendarSelectionList
      calendars={calendars}
      selectedCalendarIds={selectedCalendarIds}
      isLoading={isLoading}
      onToggle={toggleCalendar}
      onSelectAll={selectAll}
      onSelectNone={selectNone}
      onGenerateReport={handleGenerateReport}
    />
  );
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Form for custom date range
function CustomRangeForm({
  selectedCalendarNames,
  onSubmit,
}: {
  selectedCalendarNames: string[];
  onSubmit: (startDate: Date, endDate: Date) => void;
}) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  function handleSubmit() {
    if (startDate && endDate) {
      onSubmit(startDate, endDate);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Report" icon={Icon.BarChart} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Selected calendars: ${selectedCalendarNames.join(", ")}`} />
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        value={startDate}
        onChange={setStartDate}
        type={Form.DatePicker.Type.Date}
      />
      <Form.DatePicker
        id="endDate"
        title="End Date"
        value={endDate}
        onChange={setEndDate}
        type={Form.DatePicker.Type.Date}
      />
    </Form>
  );
}

// List for selecting calendars with checkmarks
function CalendarSelectionList({
  calendars,
  selectedCalendarIds,
  isLoading,
  onToggle,
  onSelectAll,
  onSelectNone,
  onGenerateReport,
}: {
  calendars: CalendarInfo[];
  selectedCalendarIds: string[];
  isLoading: boolean;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onGenerateReport: (timeRange: TimeRangeOption, customStart?: Date, customEnd?: Date) => void;
}) {
  const { push } = useNavigation();
  const [timeRange, setTimeRange] = useState<TimeRangeOption>("thisWeek");

  // Get selected calendar names for display
  const selectedCalendarNames = calendars.filter((c) => selectedCalendarIds.includes(c.id)).map((c) => c.name);

  function handleGenerateReport() {
    if (timeRange === "custom") {
      push(
        <CustomRangeForm
          selectedCalendarNames={selectedCalendarNames}
          onSubmit={(startDate, endDate) => onGenerateReport("custom", startDate, endDate)}
        />,
      );
    } else {
      onGenerateReport(timeRange);
    }
  }

  // Group selected calendars by account
  const selectedByAccount = useMemo(() => {
    const grouped = new Map<string, CalendarInfo[]>();
    for (const cal of calendars) {
      if (!selectedCalendarIds.includes(cal.id)) continue;
      const account = cal.accountName || "Other";
      if (!grouped.has(account)) grouped.set(account, []);
      grouped.get(account)!.push(cal);
    }
    return grouped;
  }, [calendars, selectedCalendarIds]);

  // Group unselected calendars by account
  const unselectedByAccount = useMemo(() => {
    const grouped = new Map<string, CalendarInfo[]>();
    for (const cal of calendars) {
      if (selectedCalendarIds.includes(cal.id)) continue;
      const account = cal.accountName || "Other";
      if (!grouped.has(account)) grouped.set(account, []);
      grouped.get(account)!.push(cal);
    }
    return grouped;
  }, [calendars, selectedCalendarIds]);

  const selectedCount = calendars.filter((c) => selectedCalendarIds.includes(c.id)).length;

  function renderCalendarItem(cal: CalendarInfo) {
    const isSelected = selectedCalendarIds.includes(cal.id);
    const tintColor = { light: cal.color, dark: cal.color, adjustContrast: false };
    return (
      <List.Item
        key={cal.id}
        icon={
          isSelected
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.Circle, tintColor: Color.SecondaryText }
        }
        title={cal.name}
        accessories={
          [
            cal.accountName ? { text: cal.accountName } : null,
            {
              icon: { source: Icon.Calendar, tintColor },
            },
          ].filter(Boolean) as List.Item.Accessory[]
        }
        actions={
          <ActionPanel>
            <Action
              title={isSelected ? "Deselect" : "Select"}
              icon={isSelected ? Icon.Circle : Icon.CheckCircle}
              onAction={() => onToggle(cal.id)}
            />
            <Action
              title="Generate Report"
              icon={Icon.BarChart}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={handleGenerateReport}
            />
            <ActionPanel.Section>
              <Action title="Select All" icon={Icon.CheckCircle} onAction={onSelectAll} />
              <Action title="Deselect All" icon={Icon.Circle} onAction={onSelectNone} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Time Range" value={timeRange} onChange={(v) => setTimeRange(v as TimeRangeOption)}>
          {Object.entries(TIME_RANGES).map(([key, range]) => (
            <List.Dropdown.Item key={key} value={key} title={range.label} />
          ))}
        </List.Dropdown>
      }
    >
      {Array.from(selectedByAccount.entries()).map(([accountName, cals]) => (
        <List.Section
          key={`selected-${accountName}`}
          title={`Selected - ${accountName}`}
          subtitle={`${cals.length} calendars`}
        >
          {cals.map((cal) => renderCalendarItem(cal))}
        </List.Section>
      ))}
      {selectedCount === 0 && (
        <List.Section title="Selected" subtitle="0 calendars">
          <List.Item icon={Icon.Circle} title="No calendars selected" />
        </List.Section>
      )}

      {Array.from(unselectedByAccount.entries()).map(([accountName, cals]) => (
        <List.Section
          key={`unselected-${accountName}`}
          title={`Not Selected - ${accountName}`}
          subtitle={`${cals.length} calendars`}
        >
          {cals.map((cal) => renderCalendarItem(cal))}
        </List.Section>
      ))}
    </List>
  );
}

// Report view showing statistics
function ReportView({
  selectedCalendarIds,
  calendarInfoMap,
  startDate,
  endDate,
  timeRangeLabel,
}: {
  selectedCalendarIds: string[];
  calendarInfoMap: Map<string, CalendarInfo>;
  startDate: Date;
  endDate: Date;
  timeRangeLabel: string;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setIsLoading(true);
      const fetchedEvents = await getCalendarEvents(selectedCalendarIds, startDate, endDate);
      if (!cancelled) {
        setEvents(fetchedEvents);
        setIsLoading(false);
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [selectedCalendarIds, startDate, endDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const calendarMap = new Map<
      string,
      { name: string; duration: number; count: number; color?: string; accountName?: string }
    >();

    // Initialize all selected calendars with info from the map
    for (const calId of selectedCalendarIds) {
      const info = calendarInfoMap.get(calId);
      calendarMap.set(calId, {
        name: info?.name || "Unknown",
        duration: 0,
        count: 0,
        color: info?.color,
        accountName: info?.accountName,
      });
    }

    // Sum up durations by calendarId
    for (const event of events) {
      const existing = calendarMap.get(event.calendarId);
      if (existing) {
        existing.duration += event.duration;
        existing.count += 1;
        // Update name from event in case calendar was renamed
        existing.name = event.calendarName;
        // Use event values as fallback if not in map
        if (!existing.color && event.calendarColor) {
          existing.color = event.calendarColor;
        }
        if (!existing.accountName && event.accountName) {
          existing.accountName = event.accountName;
        }
      }
    }

    const totalDuration = Array.from(calendarMap.values()).reduce((sum, val) => sum + val.duration, 0);

    const calendarStats: CalendarStats[] = Array.from(calendarMap.entries())
      .map(([id, data]) => ({
        calendarId: id,
        calendarName: data.name,
        calendarColor: data.color,
        accountName: data.accountName,
        totalDuration: data.duration,
        eventCount: data.count,
        percentage: totalDuration > 0 ? (data.duration / totalDuration) * 100 : 0,
      }))
      .sort((a, b) => b.totalDuration - a.totalDuration);

    return {
      totalDuration,
      calendarStats,
      totalEvents: events.length,
    };
  }, [events, selectedCalendarIds, calendarInfoMap]);

  return (
    <List isLoading={isLoading} navigationTitle={`Report: ${timeRangeLabel}`}>
      <List.Section title="Summary">
        <List.Item
          icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          title="Total Time"
          subtitle={formatDuration(stats.totalDuration)}
          accessories={[{ text: `${stats.totalEvents} events` }]}
        />
      </List.Section>

      <List.Section title="Time by Calendar">
        {stats.calendarStats.map((stat) => {
          const tintColor = stat.calendarColor
            ? { light: stat.calendarColor, dark: stat.calendarColor, adjustContrast: false }
            : Color.SecondaryText;
          return (
            <List.Item
              key={stat.calendarId}
              icon={{ source: Icon.Calendar, tintColor }}
              title={stat.calendarName}
              subtitle={formatDuration(stat.totalDuration)}
              accessories={
                [
                  stat.accountName ? { text: stat.accountName } : null,
                  { tag: { value: `${stat.percentage.toFixed(1)}%`, color: tintColor } },
                  { text: `${stat.eventCount} events` },
                ].filter(Boolean) as List.Item.Accessory[]
              }
            />
          );
        })}
        {stats.calendarStats.length === 0 && (
          <List.Item icon={Icon.XMarkCircle} title="No events found" subtitle="No events in the selected time range" />
        )}
      </List.Section>

      <List.Section title="Events">
        {events.map((event) => {
          const tintColor = event.calendarColor
            ? { light: event.calendarColor, dark: event.calendarColor, adjustContrast: false }
            : Color.SecondaryText;
          return (
            <List.Item
              key={`${event.id}-${event.startDate}`}
              icon={{ source: Icon.Dot, tintColor }}
              title={event.title}
              subtitle={formatDuration(event.duration)}
              accessories={
                [
                  event.accountName ? { text: event.accountName } : null,
                  { tag: { value: event.calendarName, color: tintColor } },
                  { text: formatEventTime(event.startDate) },
                ].filter(Boolean) as List.Item.Accessory[]
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function formatEventTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
