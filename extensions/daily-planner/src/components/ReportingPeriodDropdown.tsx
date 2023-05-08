import { getPreferenceValues, List } from "@raycast/api";
import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isMonday,
  previousFriday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { endOfToday, formatDateInterval, now, startOfToday } from "../helpers/datetime";
import { getFullDayIntervals } from "../helpers/interval";
import { TimeValueInterval } from "../types";

interface ReportingPeriod {
  readonly title: string;
  readonly interval: TimeValueInterval;
}

const { excludeWeekends } = getPreferenceValues<{ excludeWeekends: boolean }>();

const showLastFriday = excludeWeekends && !isMonday(now);
const lastDayTitle = showLastFriday ? "Last Friday" : "Yesterday";
const startOfLastDay = showLastFriday ? previousFriday(now) : addDays(startOfToday, -1);

const weekTitle = excludeWeekends ? "Monday - Friday" : "Week";
const weekStartOption = excludeWeekends ? ({ weekStartsOn: 1 } as const) : undefined;
const weekEndOption = excludeWeekends ? ({ weekStartsOn: 6 } as const) : undefined;

const aWeekAgo = addWeeks(now, -1);
const aMonthAgo = addMonths(now, -1);

const presetReportingPeriods = [
  { title: "Today", interval: { start: startOfToday.getTime(), end: endOfToday.getTime() } },
  { title: lastDayTitle, interval: { start: startOfLastDay.getTime(), end: endOfDay(startOfLastDay).getTime() } },
  {
    title: `This ${weekTitle}`,
    interval: {
      start: startOfWeek(now, weekStartOption).getTime(),
      end: endOfWeek(now, weekEndOption).getTime(),
    },
  },
  {
    title: `Last ${weekTitle}`,
    interval: {
      start: startOfWeek(aWeekAgo, weekStartOption).getTime(),
      end: endOfWeek(aWeekAgo, weekEndOption).getTime(),
    },
  },
  { title: "This Month", interval: { start: startOfMonth(now).getTime(), end: endOfMonth(now).getTime() } },
  { title: "Last Month", interval: { start: startOfMonth(aMonthAgo).getTime(), end: endOfMonth(aMonthAgo).getTime() } },
] as const;

export const initialReportingPeriod: ReportingPeriod = presetReportingPeriods[0];

export default function ReportingPeriodDropdown({
  reportingPeriod,
  setReportingPeriod,
}: {
  reportingPeriod: ReportingPeriod;
  setReportingPeriod: (newValue: ReportingPeriod) => void;
}): JSX.Element {
  const [searchText, setSearchText] = useState("");

  const [periods, filtering]: [ReportingPeriod[], boolean] = useMemo(() => {
    // Ensure currently selected value stays in the mix to avoid unintended selection change.
    const addCurrentReportingPeriodIfMissng = (periods: ReportingPeriod[]) => {
      const currentStart = reportingPeriod.interval.start;
      const currentEnd = reportingPeriod.interval.end;
      if (periods.every(({ interval: { start, end } }) => start !== currentStart || end !== currentEnd)) {
        periods.push(reportingPeriod);
      }
    };

    if (searchText) {
      const parsedPeriods = getFullDayIntervals(searchText);
      if (parsedPeriods.length > 0) {
        const lowercasedSearchText = searchText.toLowerCase();
        const periods: ReportingPeriod[] = presetReportingPeriods.filter(({ title }) =>
          title.toLowerCase().includes(lowercasedSearchText)
        );

        // Prepend parsed reporting periods that are different from preset values.
        for (const interval of parsedPeriods.reverse()) {
          const startValue = interval.start.getTime();
          const endValue = interval.end.getTime();
          if (periods.every(({ interval: { start, end } }) => start !== startValue || end !== endValue)) {
            periods.unshift({
              title: formatDateInterval(interval),
              interval: { start: startValue, end: endValue },
            });
          }
        }

        addCurrentReportingPeriodIfMissng(periods);
        return [periods, false];
      }
    }

    const periods: ReportingPeriod[] = [...presetReportingPeriods];
    addCurrentReportingPeriodIfMissng(periods);
    return [periods, true];
  }, [searchText, reportingPeriod]);

  const stringifiedReportingPeriod = JSON.stringify(reportingPeriod);

  function updateReportingPeriod(selectedItemValue: string): void {
    const period = JSON.parse(selectedItemValue) as ReportingPeriod;
    setReportingPeriod(period);
  }

  return (
    <List.Dropdown
      tooltip="Select a reporting period"
      placeholder="Enter date range expression"
      filtering={filtering}
      throttle={false}
      value={stringifiedReportingPeriod}
      onSearchTextChange={setSearchText}
      onChange={updateReportingPeriod}
    >
      {periods.map((period) => (
        <List.Dropdown.Item key={period.title} title={period.title} value={JSON.stringify(period)} />
      ))}
    </List.Dropdown>
  );
}
