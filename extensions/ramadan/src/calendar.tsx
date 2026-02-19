import {
  List,
  Icon,
  Color,
  showToast,
  Toast,
  updateCommandMetadata,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getHijriCalendar,
  getHijriDate,
  getTimingsByDate,
  getLocation,
} from "./api";
import {
  getSuhoorTime,
  getIftarTime,
  formatTime,
  getHijriDateOffset,
  formatDateForApi,
} from "./utils";
import { RamadanDay, Preferences } from "./types";

/**
 * Determine the current or next Ramadan's Hijri year
 * Ramadan is month 9 in the Hijri calendar
 */
async function getRamadanHijriYear(): Promise<number> {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  const hijri = await getHijriDate(dateStr);
  const currentMonth = hijri.hijriMonth;
  const currentYear = parseInt(hijri.hijriYear, 10);

  // If we're past Ramadan (month > 9), use next year
  if (currentMonth > 9) {
    return currentYear + 1;
  }
  return currentYear;
}

export default function CalendarCommand() {
  const [days, setDays] = useState<RamadanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [hijriYear, setHijriYear] = useState<number>(0);

  useEffect(() => {
    async function fetchCalendar() {
      try {
        const year = await getRamadanHijriYear();
        setHijriYear(year);

        // Fetch Ramadan (month 9) calendar
        const calendar = await getHijriCalendar(9, year);
        const offset = getHijriDateOffset();

        const today = new Date();
        const todayStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

        // Build a lookup map: Gregorian date string → prayer timings
        const timingsMap = new Map<
          string,
          (typeof calendar.data)[0]["timings"]
        >();
        for (const day of calendar.data) {
          const g = day.date.gregorian;
          const key = `${parseInt(g.day)}-${g.month.number}-${g.year}`;
          timingsMap.set(key, day.timings);
        }

        // Determine standard Gregorian start of Ramadan from API
        const firstEntry = calendar.data[0].date.gregorian;
        const standardStart = new Date(
          parseInt(firstEntry.year),
          firstEntry.month.number - 1,
          parseInt(firstEntry.day),
        );

        // Shift start by -offset days:
        // offset=-1 → Ramadan starts 1 day LATER (for local moon sighting delay)
        const adjustedStart = new Date(standardStart);
        adjustedStart.setDate(adjustedStart.getDate() - offset);

        const numDays = calendar.data.length;
        const { city, country } = getLocation();
        const prefs = getPreferenceValues<Preferences>();
        const method = prefs.method || "2";

        const ramadanDays: RamadanDay[] = [];

        for (let i = 0; i < numDays; i++) {
          const gregDate = new Date(adjustedStart);
          gregDate.setDate(gregDate.getDate() + i);

          const dateKey = `${gregDate.getDate()}-${gregDate.getMonth() + 1}-${gregDate.getFullYear()}`;

          // Use cached API timings if available, otherwise fetch for this date
          let timings = timingsMap.get(dateKey);
          if (!timings) {
            const formatted = formatDateForApi(gregDate);
            const result = await getTimingsByDate(
              formatted,
              city,
              country,
              method,
            );
            timings = result.data.timings;
          }

          const gregDateStr = gregDate.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

          const isToday = dateKey === todayStr;
          const isPast = !isToday && gregDate < today;

          ramadanDays.push({
            dayNumber: i + 1,
            gregorianDate: gregDateStr,
            hijriDate: `${i + 1} Ramadan ${year}`,
            suhoor: getSuhoorTime(timings.Fajr),
            iftar: getIftarTime(timings.Maghrib),
            isToday,
            isPast,
          });
        }

        setDays(ramadanDays);

        // Update root search subtitle with Hijri date
        const todayEntry = ramadanDays.find((d) => d.isToday);
        if (todayEntry) {
          await updateCommandMetadata({
            subtitle: todayEntry.hijriDate + " AH",
          });
        } else {
          await updateCommandMetadata({ subtitle: `Ramadan ${year} AH` });
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load Ramadan calendar",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchCalendar();
  }, []);

  return (
    <List
      isLoading={loading}
      navigationTitle={`Ramadan ${hijriYear} Calendar`}
      searchBarPlaceholder="Search by day number or date..."
    >
      {days.length === 0 && !loading && (
        <List.EmptyView
          title="Could not load Ramadan calendar"
          description="Check your internet connection or preferences"
          icon={Icon.Warning}
        />
      )}
      {days.map((day) => (
        <List.Item
          key={day.dayNumber}
          icon={{
            source: day.isToday
              ? Icon.Star
              : day.isPast
                ? Icon.Checkmark
                : Icon.Circle,
            tintColor: day.isToday
              ? Color.Yellow
              : day.isPast
                ? Color.Green
                : Color.SecondaryText,
          }}
          title={`${day.dayNumber} Ramadan`}
          subtitle={day.gregorianDate}
          accessories={[
            {
              icon: { source: Icon.Moon, tintColor: Color.Purple },
              text: formatTime(day.suhoor),
              tooltip: "Suhoor",
            },
            {
              icon: { source: Icon.Sun, tintColor: Color.Orange },
              text: formatTime(day.iftar),
              tooltip: "Iftar",
            },
          ]}
        />
      ))}
    </List>
  );
}
