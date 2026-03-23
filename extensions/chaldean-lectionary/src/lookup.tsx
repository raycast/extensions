import { List, ActionPanel, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { readings2026, DayReadings } from "./data/readings2026";
import { weekdayReadings2026, WeekdayReadings } from "./data/weekdayReadings2026";
import { fetchScripture } from "./utils/fetchScripture";

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

function getItems(
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

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTitle(dateStr: string): string {
  const sunday = readings2026[dateStr];
  const weekday = weekdayReadings2026[dateStr];
  return sunday?.title ?? weekday?.title ?? "";
}

export default function LookupReadings() {
  const [searchText, setSearchText] = useState<string>("");

  // Merge all dates from both sources
  const allDates = Array.from(
    new Set([...Object.keys(readings2026), ...Object.keys(weekdayReadings2026)])
  ).sort();

  const filtered = allDates.filter((dateStr) => {
    if (!searchText) return true;
    const query = searchText.toLowerCase();
    const formatted = formatDate(dateStr).toLowerCase();
    const title = getTitle(dateStr).toLowerCase();
    const [year, month, day] = dateStr.split("-").map(Number);
    const shortDate1 = `${month}/${day}`;
    const shortDate2 = `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
    return (
      formatted.includes(query) ||
      title.includes(query) ||
      dateStr.includes(query) ||
      shortDate1.includes(query) ||
      shortDate2.includes(query)
    );
  });

  return (
    <List
      searchBarPlaceholder="Search by date (3/22), month, or season (Sawma, Elijah...)"
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
    >
      {filtered.map((dateStr) => {
        const sunday = readings2026[dateStr];
        const weekday = weekdayReadings2026[dateStr];
        const title = getTitle(dateStr);
        const items = getItems(sunday, weekday);
        const formattedDate = formatDate(dateStr);

        return (
          <List.Section key={dateStr} title={`${formattedDate} — ${title}`}>
            {items.map((item) => (
              <List.Item
                key={item.citation}
                title={item.label}
                subtitle={item.citation}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Read Scripture"
                      target={
                        <ReadingDetail
                          title={item.label}
                          citation={item.citation}
                        />
                      }
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}