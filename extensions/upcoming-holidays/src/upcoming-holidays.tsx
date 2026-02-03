import { ActionPanel, Action, Icon, List, Color, getPreferenceValues } from "@raycast/api";
import { readFile } from "fs/promises";
import { useEffect, useState } from "react";

import fallbackHolidays from "./holidays.json";

type Holiday = {
  name: string;
  date: string; // YYYY-MM-DD
};

const { holidayDataJson } = getPreferenceValues<{
  holidayDataJson: string;
}>();

// ----------------- helpers -----------------

function parseIsoLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.ceil((b - a) / MS_PER_DAY);
}

function formatLocalDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function isLongWeekend(date: Date): boolean {
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri
  return day === 1 || day === 5;
}

// ----------------- command -----------------

export default function Command() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [holidays, setHolidays] = useState<(Holiday & { id: number; dateObj: Date })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHolidays() {
      try {
        const content = await readFile(holidayDataJson, "utf-8");
        const parsed = JSON.parse(content);

        if (!Array.isArray(parsed)) {
          throw new Error("Holiday JSON must be an array");
        }

        setHolidays(
          parsed.map((h: Holiday, index: number) => ({
            id: index,
            ...h,
            dateObj: parseIsoLocalDate(h.date),
          })),
        );
      } catch (err) {
        console.error("Failed to load holiday file, using fallback:", err);

        // fallback to bundled JSON
        setHolidays(
          (fallbackHolidays as Holiday[]).map((h, index) => ({
            id: index,
            ...h,
            dateObj: parseIsoLocalDate(h.date),
          })),
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadHolidays();
  }, [holidayDataJson]);

  const sortedHolidays = [...holidays].sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const nextHoliday = sortedHolidays.find((h) => h.dateObj >= today);

  return (
    <List isLoading={isLoading}>
      {sortedHolidays.map((holiday) => {
        const isPast = holiday.dateObj < today;
        const isNext = holiday === nextHoliday;
        const daysRemaining = daysBetween(today, holiday.dateObj);

        let subtitle = formatLocalDate(holiday.dateObj);
        if (!isPast) {
          subtitle += isNext
            ? ` • in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`
            : ` • ${daysRemaining} days away`;
        }

        return (
          <List.Item
            key={holiday.id}
            title={holiday.name}
            subtitle={subtitle}
            icon={{
              source: isNext ? Icon.Star : isPast ? Icon.Dot : Icon.Calendar,
              tintColor: isPast ? Color.SecondaryText : undefined,
            }}
            accessories={[
              ...(isLongWeekend(holiday.dateObj) ? [{ icon: Icon.Paperclip, text: "(Long Weekend)" }] : []),
              {
                icon: isNext ? Icon.Star : isPast ? Icon.Clock : Icon.Calendar,
                text: isNext ? "NEXT" : isPast ? "PAST" : "UPCOMING",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Holiday Name and Date"
                  content={`${holiday.name} (${formatLocalDate(holiday.dateObj)})`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
