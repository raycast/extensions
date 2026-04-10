import { List, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { readings2026 } from "./data/readings2026";
import { weekdayReadings2026 } from "./data/weekdayReadings2026";
import { ReadingDetail, ReadingItem, getReadingItems } from "./components/ReadingDetail";

function getTodayKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TodayReadings() {
  const [dayTitle, setDayTitle] = useState<string>("Loading...");
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const prefs = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function load() {
      const todayKey = getTodayKey();
      const sunday = readings2026[todayKey];
      const weekday = weekdayReadings2026[todayKey];

      let title = sunday?.title ?? weekday?.title ?? "No readings found for today";

      // Check Google Calendar for override
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          prefs.calendarId,
        )}/events?key=${prefs.googleApiKey}&timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true`;

        const response = await fetch(url);
        const data = (await response.json()) as {
          items?: { summary: string }[];
        };

        if (data.items && data.items.length > 0) {
          const calendarTitle = data.items[0].summary;
          if (calendarTitle && calendarTitle !== title) {
            title = `${title} · 📅 ${calendarTitle}`;
          }
        }
      } catch (error) {
        console.error("Failed to fetch calendar data:", error);
      }

      setDayTitle(title);
      setItems(getReadingItems(sunday, weekday));
      setLoading(false);
    }

    load();
  }, []);

  return (
    <List navigationTitle={dayTitle} isLoading={loading}>
      <List.Section title={dayTitle}>
        {items.map((item) => (
          <List.Item
            key={item.citation}
            title={item.label}
            subtitle={item.citation}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Read Scripture"
                  target={<ReadingDetail title={item.label} citation={item.citation} />}
                />
              </ActionPanel>
            }
          />
        ))}
        {!loading && items.length === 0 && (
          <List.Item title="No readings found" subtitle={`No readings recorded for today`} />
        )}
      </List.Section>
    </List>
  );
}
