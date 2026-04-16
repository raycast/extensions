import { List, ActionPanel, Action, showToast, Toast, Clipboard, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";

// ─── Helpers ──────────────────────────────────────────────────

function getDateTag(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function parseTag(tag: string): Date {
  const [y,m,d] = tag.split("-").map(Number);
  return new Date(y, m-1, d);
}

function niceDate(tag: string): string {
  const d = parseTag(tag);
  const day = d.getDate();
  const suffix = [1,21,31].includes(day) ? "st" : [2,22].includes(day) ? "nd" : [3,23].includes(day) ? "rd" : "th";
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `${day}${suffix} of ${month} ${year}`;
}

// ─── Types ───────────────────────────────────────────────────

interface Entry {
  id: string;
  text: string;
  time: string;
}

// ─── Storage ──────────────────────────────────────────────────

function entriesKey(tag: string): string { return `dayLogEntries_${tag}`; }
const ALL_DATES_KEY = "allLogDates";

// ─── Component ───────────────────────────────────────────────

export default function Command() {
  const [allDates, setAllDates] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [dayEntries, setDayEntries] = useState<Entry[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const stored = await LocalStorage.getItem<string>(ALL_DATES_KEY);
      const dates: string[] = stored ? JSON.parse(stored) : [];
      setAllDates(dates.sort().reverse());

      const prev: Record<string, string> = {};
      for (const tag of dates) {
        const s = await LocalStorage.getItem<string>(entriesKey(tag));
        const es: Entry[] = s ? JSON.parse(s) : [];
        if (es.length > 0) {
          const preview = es[0].text.slice(0, 60);
          prev[tag] = preview.length < es[0].text.length ? preview + "..." : preview;
        }
      }
      setPreviews(prev);
    }
    load();
  }, []);

  async function selectDay(tag: string) {
    setSelectedTag(tag);
    const stored = await LocalStorage.getItem<string>(entriesKey(tag));
    setDayEntries(stored ? JSON.parse(stored) : []);
  }

  async function copyDay() {
    if (!selectedTag || dayEntries.length === 0) return;
    const lines = dayEntries.map(e => `[${e.time}] ${e.text}`);
    const full = `${niceDate(selectedTag)}\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
    await Clipboard.copy(full);
    await showToast({ style: Toast.Style.Success, title: "Copied" });
  }

  async function deleteDay() {
    if (!selectedTag) return;
    const confirmed = await confirmAlert({ title: "Delete Day?", message: "This will permanently delete all moments for this day." });
    if (!confirmed) return;
    await LocalStorage.removeItem(entriesKey(selectedTag));
    const stored = await LocalStorage.getItem<string>(ALL_DATES_KEY);
    const dates: string[] = stored ? JSON.parse(stored) : [];
    const updated = dates.filter(d => d !== selectedTag);
    await LocalStorage.setItem(ALL_DATES_KEY, JSON.stringify(updated));
    setSelectedTag(null);
    await showToast({ style: Toast.Style.Success, title: "Day deleted" });
  }

  // ── Day detail ──
  if (selectedTag) {
    const words = dayEntries.reduce((s, e) => s + e.text.split(" ").length, 0);
    return (
      <List
        actions={
          <ActionPanel>
            <Action title="Back" icon="chevron.left" onAction={() => setSelectedTag(null)} />
            {dayEntries.length > 0 && <Action title="Copy Day" icon="doc.on.clipboard" onAction={copyDay} />}
            <Action title="Delete Day" onAction={deleteDay} />
          </ActionPanel>
        }
        navigationTitle="MyDiary"
      >
        <List.Item
          title={niceDate(selectedTag)}
          subtitle={`${dayEntries.length} moments · ${words} words`}
        />

        {dayEntries.length > 0 && (
          <List.Item
            title="Copy all to clipboard"
            subtitle="Paste into MyDiary, Obsidian, Notes..."
            actions={
              <ActionPanel>
                <Action title="Copy" onAction={copyDay} />
              </ActionPanel>
            }
          />
        )}

        {dayEntries.map((e) => (
          <List.Item key={e.id} title={e.text} subtitle={e.time} />
        ))}

        {dayEntries.length === 0 && (
          <List.Item title="No moments" subtitle="Run record day to start logging" />
        )}
      </List>
    );
  }

  // ── Main list ──
  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Go to Today" icon="sun.max" onAction={() => selectDay(getDateTag(new Date()))} />
        </ActionPanel>
      }
      navigationTitle="MyDiary"
    >
      {allDates.includes(getDateTag(new Date())) && (
        <List.Item
          title="Today"
          subtitle={previews[getDateTag(new Date())] || ""}
          actions={
            <ActionPanel>
              <Action title="Open" onAction={() => selectDay(getDateTag(new Date()))} />
            </ActionPanel>
          }
        />
      )}

      {allDates.length > 0 && (
        <List.Item title={""} subtitle={`${allDates.length} days in your diary`} />
      )}

      {allDates.map(tag => (
        <List.Item
          key={tag}
          title={niceDate(tag)}
          subtitle={previews[tag] || ""}
          actions={
            <ActionPanel>
              <Action title="Open" onAction={() => selectDay(tag)} />
            </ActionPanel>
          }
        />
      ))}

      {allDates.length === 0 && (
        <List.Item title="Your diary is empty" subtitle="Run record day to capture your first moment" />
      )}
    </List>
  );
}