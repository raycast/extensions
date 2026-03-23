import { List, ActionPanel, Action, Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { readings2026, DayReadings } from "./data/readings2026";
import { weekdayReadings2026, WeekdayReadings } from "./data/weekdayReadings2026";
import { fetchScripture } from "./utils/fetchScripture";

interface Preferences {
  calendarId: string;
  googleApiKey: string;
}

function getTodayKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ReadingDetail({ title, citation }: { title: string; citation: string }) {
  const [markdown, setMarkdown] = useState<string>("# Loading...\n\nFetching scripture from USCCB...");

  useEffect(() => {
    async function load() {
      const text = await fetchScripture(citation);
      setMarkdown(`# ${title}\n*${citation}*\n\n---\n\n${text}`);
    }
    load();
  }, [citation]);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Paste
            title="Paste Reading"
            content={markdown.replace(/^#.*\n\*.*\n\n---\n\n/, "")}
          />
          <Action.CopyToClipboard
            title="Copy Reading"
            content={markdown.replace(/^#.*\n\*.*\n\n---\n\n/, "")}
          />
        </ActionPanel>
      }
    />
  );
}

type ReadingItem = { label: string; citation: string };

function getReadingItems(
  sunday: DayReadings | undefined,
  weekday: WeekdayReadings | undefined
): ReadingItem[] {
  if (sunday) {
    return [
      sunday.reading1 && { label: "📖 First Reading", citation: sunday.reading1 },
      sunday.reading2 && { label: "📖 Second Reading", citation: sunday.reading2 },
      { label: "✉️ Epistle", citation: sunday.epistle },
      { label: "✝️ Gospel", citation: sunday.gospel },
    ].filter(Boolean) as ReadingItem[];
  }
  if (weekday) {
    return [
      { label: "✉️ Epistle", citation: weekday.epistle },
      { label: "✝️ Gospel", citation: weekday.gospel },
    ];
  }
  return [];
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
          prefs.calendarId
        )}/events?key=${prefs.googleApiKey}&timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true`;

        const response = await fetch(url);
        const data = await response.json() as { items?: { summary: string }[] };

        if (data.items && data.items.length > 0) {
          const calendarTitle = data.items[0].summary;
          if (calendarTitle && calendarTitle !== title) {
            title = `${title} · 📅 ${calendarTitle}`;
          }
        }
      } catch {
        // Fall back silently
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
          <List.Item
            title="No readings found"
            subtitle={`No readings recorded for today`}
          />
        )}
      </List.Section>
    </List>
  );
}