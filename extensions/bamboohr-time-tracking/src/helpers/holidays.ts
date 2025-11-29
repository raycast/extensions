import { Preferences } from "../preferences";
import { createClient } from "./client";

export interface DayOffInfo {
  date: string;
  type: "holiday" | "vacation";
  name: string;
}

export async function getUserDayOffs(
  startDate: string,
  endDate: string,
  preferences: Preferences,
): Promise<DayOffInfo[]> {
  const client = createClient(preferences);
  const whosOutEntries = await client.getWhosOut(startDate, endDate);

  const userEmployeeId = parseInt(preferences.employeeId);
  const dayOffs: DayOffInfo[] = [];

  for (const entry of whosOutEntries) {
    // Include holidays (company-wide) and user's own time off
    if (entry.type === "holiday" || entry.employeeId === userEmployeeId) {
      const startEntryDate = new Date(entry.start);
      const endEntryDate = new Date(entry.end);

      // Generate all dates in the range
      const currentDate = new Date(startEntryDate);
      while (currentDate <= endEntryDate) {
        const dateString = currentDate.toISOString().split("T")[0];

        dayOffs.push({
          date: dateString,
          type: entry.type === "holiday" ? "holiday" : "vacation",
          name: entry.type === "holiday" ? entry.name : "Vacation Day",
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  // Remove duplicates and sort by date
  const uniqueDayOffs = new Map<string, DayOffInfo>();
  for (const dayOff of dayOffs) {
    if (!uniqueDayOffs.has(dayOff.date)) {
      uniqueDayOffs.set(dayOff.date, dayOff);
    }
  }

  return Array.from(uniqueDayOffs.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function getAllDatesInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const date = new Date(year, month, 1);

  while (date.getMonth() === month) {
    dates.push(date.toISOString().split("T")[0]);
    date.setDate(date.getDate() + 1);
  }

  return dates;
}

export function getDayOffForDate(
  dayOffs: DayOffInfo[],
  date: string,
): DayOffInfo | undefined {
  return dayOffs.find((dayOff) => dayOff.date === date);
}
