import { Action, ActionPanel, Color, Form, Icon, List, useNavigation } from "@raycast/api";

import { useEffect, useState } from "react";
import {
  formatDateLabel,
  formatDuration,
  getDuration,
  getTimers,
  getTimersByDateRange,
  groupTimersByDay,
  groupTimersByProject,
  Timer,
} from "./Timers";

type PeriodKey = "today" | "week" | "30days" | "custom";

function getDateRange(period: PeriodKey): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (period) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { start, end };
    }
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "30days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    default:
      return { start: new Date(0), end };
  }
}

function CustomDatePicker(props: { onSubmit: (start: Date, end: Date) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply"
            icon={Icon.Calendar}
            onSubmit={(values: { start: Date; end: Date }) => {
              props.onSubmit(values.start, values.end);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="start" title="Start Date" />
      <Form.DatePicker id="end" title="End Date" />
    </Form>
  );
}

export default function Command() {
  const [allTimers, setAllTimers] = useState<Timer[]>([]);
  const [filteredTimers, setFilteredTimers] = useState<Timer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    getTimers().then((list) => {
      const timers = Object.values(list).sort((a, b) => b.start - a.start);
      setAllTimers(timers);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (period === "custom" && customRange) {
      setFilteredTimers(getTimersByDateRange(allTimers, customRange.start, customRange.end));
    } else if (period !== "custom") {
      const { start, end } = getDateRange(period);
      setFilteredTimers(getTimersByDateRange(allTimers, start, end));
    }
  }, [allTimers, period, customRange]);

  const projectGroups = groupTimersByProject(filteredTimers);
  const dayGroups = groupTimersByDay(filteredTimers);
  const sortedDayKeys = Array.from(dayGroups.keys()).sort((a, b) => b.localeCompare(a));
  const totalDuration = filteredTimers.reduce((sum, t) => sum + getDuration(t), 0);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Period"
          value={period}
          onChange={(value) => {
            setPeriod(value as PeriodKey);
          }}
        >
          <List.Dropdown.Item title="Today" value="today" />
          <List.Dropdown.Item title="Past Week" value="week" />
          <List.Dropdown.Item title="Past 30 Days" value="30days" />
          {customRange && <List.Dropdown.Item title="Custom Range" value="custom" />}
        </List.Dropdown>
      }
    >
      <List.Section title="Actions">
        <List.Item
          title="Custom Date Range..."
          icon={Icon.Calendar}
          actions={
            <ActionPanel>
              <Action.Push
                title="Pick Custom Range"
                target={
                  <CustomDatePicker
                    onSubmit={(start, end) => {
                      setCustomRange({ start, end });
                      setPeriod("custom");
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Project Summary" subtitle={`Total: ${formatDuration(totalDuration)}`}>
        {Array.from(projectGroups.entries())
          .sort(([, a], [, b]) => b.totalDuration - a.totalDuration)
          .map(([name, data]) => (
            <List.Item
              key={`project-${name}`}
              title={name}
              subtitle={`${data.count} session${data.count !== 1 ? "s" : ""}`}
              accessories={[
                {
                  tag: { value: formatDuration(data.totalDuration), color: Color.Blue },
                  icon: Icon.Clock,
                },
                {
                  text: `${(data.totalDuration / 3600000).toFixed(1)}h`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Duration" content={formatDuration(data.totalDuration)} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>

      {sortedDayKeys.map((dayKey) => {
        const dayTimers = dayGroups.get(dayKey) || [];
        const dayTotal = dayTimers.reduce((sum, t) => sum + getDuration(t), 0);
        return (
          <List.Section key={dayKey} title={formatDateLabel(dayKey)} subtitle={formatDuration(dayTotal)}>
            {dayTimers.map((timer) => (
              <List.Item
                key={timer.id}
                title={timer.name ?? "Unnamed timer"}
                subtitle={
                  timer.end
                    ? new Date(timer.start).toLocaleTimeString() + " - " + new Date(timer.end).toLocaleTimeString()
                    : new Date(timer.start).toLocaleTimeString() + " (running)"
                }
                accessories={[{ tag: timer.tag }, { text: formatDuration(getDuration(timer)) }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Duration" content={formatDuration(getDuration(timer))} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}

      {filteredTimers.length === 0 && !isLoading && (
        <List.Section title="No Timers Found">
          <List.Item title="No tracked time for this period" icon={Icon.Clock} />
        </List.Section>
      )}
    </List>
  );
}
