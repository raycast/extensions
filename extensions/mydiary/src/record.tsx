import { Form, ActionPanel, Action, showToast, Toast, Clipboard, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(date: Date): string {
  const day = date.getDate();
  const suffix = [1,21,31].includes(day) ? "st" : [2,22].includes(day) ? "nd" : [3,23].includes(day) ? "rd" : "th";
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${day}${suffix} of ${month} ${year}`;
}

function getDateTag(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── Types ───────────────────────────────────────────────────

interface Entry {
  id: string;
  text: string;
  time: string;
}

// ─── Storage ──────────────────────────────────────────────────

function entriesKey(tag: string): string { return `dayLogEntries_${tag}`; }
const DATE_KEY = "dayLogDate";
const ALL_DATES_KEY = "allLogDates";

// ─── Component ───────────────────────────────────────────────

export default function Command() {
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dateTag] = useState(() => getDateTag(new Date()));
  const [dateStr] = useState(() => formatDate(new Date()));

  // Load
  useEffect(() => {
    async function load() {
      const storedTag = await LocalStorage.getItem<string>(DATE_KEY);
      const nowTag = getDateTag(new Date());
      if (storedTag !== nowTag) {
        await LocalStorage.setItem(entriesKey(nowTag), "[]");
        await LocalStorage.setItem(DATE_KEY, nowTag);
        return;
      }
      const stored = await LocalStorage.getItem<string>(entriesKey(nowTag));
      if (stored) setEntries(JSON.parse(stored));
    }
    load();
  }, []);

  async function saveEntry() {
    if (!input.trim()) return;
    const newEntries: Entry[] = [...entries, { id: Date.now().toString(36), text: input.trim(), time: formatTime(new Date()) }];
    setEntries(newEntries);
    await LocalStorage.setItem(entriesKey(dateTag), JSON.stringify(newEntries));

    // Track date
    const allDates = await LocalStorage.getItem<string>(ALL_DATES_KEY);
    const dates: string[] = allDates ? JSON.parse(allDates) : [];
    if (!dates.includes(dateTag)) {
      dates.push(dateTag);
      dates.sort().reverse();
      await LocalStorage.setItem(ALL_DATES_KEY, JSON.stringify(dates));
    }

    setInput("");
    setSaved(true);
    setCopied(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function copyDay() {
    if (entries.length === 0) return;
    const lines = entries.map(e => `[${e.time}] ${e.text}`);
    const full = `${dateStr}\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
    await Clipboard.copy(full);
    setCopied(true);
    setSaved(false);
    await showToast({ style: Toast.Style.Success, title: "Copied ✓" });
  }

  async function clearDay() {
    const confirmed = await confirmAlert({ title: "Clear Day?", message: "This will permanently delete all moments for today." });
    if (!confirmed) return;
    await LocalStorage.setItem(entriesKey(dateTag), "[]");
    setEntries([]);
    await showToast({ style: Toast.Style.Success, title: "Day cleared" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Entry" icon="plus.circle" onSubmit={saveEntry} />
          <Action title="Copy Day" onAction={copyDay} />
          {entries.length > 0 && <Action title="Clear Day" onAction={clearDay} />}
        </ActionPanel>
      }
      navigationTitle="MyDiary"
    >
      {/* Date as header */}
      <Form.Description title={dateStr} text={entries.length === 0 ? "Start your day" : `${entries.length} ${entries.length === 1 ? "moment" : "moments"} captured`} />

      {/* Input */}
      <Form.TextArea
        id="entry"
        title="What happened?"
        placeholder="Type or dictate your moment..."
        value={input}
        onChange={setInput}
        autoFocus
        enableMarkdown={false}
      />

      {/* Status */}
      {saved && (
        <Form.Description title="" text="✓ Moment saved" />
      )}

      {/* Recent entries */}
      {entries.length > 0 && (
        <>
          <Form.Separator />
          {entries.slice(-3).reverse().map(e => (
            <Form.Description
              key={e.id}
              title={`${e.time}`}
              text={e.text.length > 80 ? e.text.slice(0, 80) + "..." : e.text}
            />
          ))}
        </>
      )}

      {/* Copy hint */}
      {copied && entries.length > 0 && (
        <Form.Description title="" text="✓ Copied — paste it wherever" />
      )}
    </Form>
  );
}