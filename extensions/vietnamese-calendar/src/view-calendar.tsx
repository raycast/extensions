import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import React, { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addYears,
  subYears,
  isSameMonth,
  isToday,
  getWeek,
} from "date-fns";
import { SolarDate } from "lunar-date-vn";
import { getHoliday, isOfficialHoliday } from "./utils/holidays";
import DayDetailView from "./view-day-detail";

export default function CalendarGrid() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedId, setSelectedId] = useState<string | undefined>(
    format(new Date(), "yyyy-MM-dd"),
  );

  const { days, currentMonthName } = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    const startWeek = getWeek(startDate, { weekStartsOn: 1 });
    const endWeek = getWeek(endDate, { weekStartsOn: 1 });

    return {
      days,
      currentMonthName: `${format(currentDate, "MMMM yyyy")} (W${startWeek} -> W${endWeek})`,
    };
  }, [currentDate]);

  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextYear = () => setCurrentDate(addYears(currentDate, 1));
  const handlePreviousYear = () => setCurrentDate(subYears(currentDate, 1));
  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedId(format(today, "yyyy-MM-dd"));
  };

  return (
    <Grid
      columns={7}
      inset={Grid.Inset.Small}
      navigationTitle={`Calendar - ${currentMonthName}`}
      searchBarPlaceholder={`Viewing ${currentMonthName}`}
      onSearchTextChange={() => {}}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id || undefined)}
    >
      <Grid.Section title={currentMonthName}>
        {days.map((day) => {
          const solar = new SolarDate(day);
          const lunar = solar.toLunarDate();
          const lunarInfo = lunar ? lunar.get() : null;

          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);

          // Format: 1/1 (Lunar)
          const lunarString = lunarInfo
            ? `${lunarInfo.day}/${lunarInfo.month}`
            : "";
          const lunarDay = lunarInfo ? lunarInfo.day : 0;
          const lunarMonth = lunarInfo ? lunarInfo.month : 0;

          // Holiday
          const holiday = isCurrentMonth
            ? getHoliday(day, lunarDay, lunarMonth, "short")
            : null;
          const isOfficial = isCurrentMonth
            ? isOfficialHoliday(day, lunarDay, lunarMonth)
            : false;

          // Solar day
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const dayId = format(day, "yyyy-MM-dd");

          return (
            <Grid.Item
              id={dayId}
              key={day.toISOString()}
              content={getIconForDay(
                day,
                lunarString,
                lunarDay,
                isDayToday,
                isCurrentMonth,
                isWeekend,
                holiday,
                isOfficial,
              )}
              keywords={[dayId]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Day Details"
                    target={<DayDetailView date={day} />}
                    icon={Icon.Sidebar}
                  />
                  <Action
                    title="Next Month"
                    onAction={handleNextMonth}
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                  />
                  <Action
                    title="Previous Month"
                    onAction={handlePreviousMonth}
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                  />
                  <Action
                    title="Next Year"
                    onAction={handleNextYear}
                    icon={Icon.Forward}
                    shortcut={{
                      modifiers: ["cmd", "shift"],
                      key: "arrowRight",
                    }}
                  />
                  <Action
                    title="Previous Year"
                    onAction={handlePreviousYear}
                    icon={Icon.Rewind}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
                  />
                  <Action
                    title="Go to Today"
                    onAction={handleGoToToday}
                    icon={Icon.Calendar}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
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

function getIconForDay(
  date: Date,
  lunarString: string,
  lunarDay: number,
  isToday: boolean,
  isCurrentMonth: boolean,
  isWeekend: boolean,
  holiday: string | null,
  isOfficial: boolean,
) {
  const dayNumber = format(date, "d");

  // Solar Color Logic:
  let solarColor = isCurrentMonth ? "#FFFFFF" : "#666666";
  if (isCurrentMonth) {
    if (isToday) {
      solarColor = "#4D8FFF";
    } else if (isOfficial) {
      solarColor = "#FF6363";
    } else if (isWeekend) {
      solarColor = "#FF6363";
    }
  }

  // Lunar Color Logic:
  let lunarColor = isCurrentMonth ? "#AAAAAA" : "#444444";
  if ((lunarDay === 1 || lunarDay === 15) && isCurrentMonth) {
    lunarColor = "#FF6363";
  }

  let svgContent = "";
  if (holiday) {
    svgContent = `
        <text x="256" y="80" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="256" fill="${solarColor}">${dayNumber}</text>
        <text x="256" y="500" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="120" fill="${lunarColor}">${lunarString}</text>
        <text x="256" y="290" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="110" fill="#FFD700">${holiday}</text>
        `;
  } else {
    svgContent = `
        <text x="256" y="80" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="256" fill="${solarColor}">${dayNumber}</text>
        <text x="256" y="500" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="120" fill="${lunarColor}">${lunarString}</text>
        `;
  }

  const svg = `
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="transparent" />
    ${svgContent}
  </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
