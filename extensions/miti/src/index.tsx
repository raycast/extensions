import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Form,
  showToast,
  Toast,
  popToRoot,
  showHUD,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import { useState, useMemo } from "react";
import {
  getTodayBs,
  formatBsDate,
  formatBsDateNp,
  bsToAd,
  adToBs,
  formatAdDate,
  getBsDayOfWeek,
  getBsMonthDays,
  WEEKDAY_NAMES_NP,
  BS_MONTH_NAMES,
  BsDate,
} from "./utils/nepali-date";
import { getCurrentTithi } from "./utils/holidays";
import { generateCalendarSvg } from "./utils/calendar-renderer";

// ─── Helpers ────────────────────────────────────────────────────────────────

// ─── Sub-Views ─────────────────────────────────────────────────────────────

function ConverterForm() {
  const [mode, setMode] = useState<"ad-to-bs" | "bs-to-ad">("ad-to-bs");
  const [dateStr, setDateStr] = useState("");
  const [result, setResult] = useState("");

  const handleConvert = (input: string, currentMode: string) => {
    try {
      const parts = input.split(/[/\-.]/).map((p) => parseInt(p));
      if (parts.length !== 3) return;

      const [d, m, y] = parts;

      if (currentMode === "ad-to-bs") {
        const bs = adToBs(y, m, d);
        setResult(`${formatBsDate(bs)} (${formatBsDateNp(bs)})`);
      } else {
        const ad = bsToAd(y, m, d);
        setResult(formatAdDate(ad));
      }
    } catch {
      setResult("Invalid date format. Use DD/MM/YYYY");
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Convert"
            onSubmit={(values) => handleConvert(values.dateInput, values.mode)}
          />
          {result && (
            <Action.CopyToClipboard title="Copy Result" content={result} />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="mode"
        title="Mode"
        value={mode}
        onChange={(val) => setMode(val as "ad-to-bs" | "bs-to-ad")}
      >
        <Form.Dropdown.Item
          title="AD to BS (English to Nepali)"
          value="ad-to-bs"
        />
        <Form.Dropdown.Item
          title="BS to AD (Nepali to English)"
          value="bs-to-ad"
        />
      </Form.Dropdown>

      <Form.TextField
        id="dateInput"
        title="Enter Date"
        placeholder="DD/MM/YYYY"
        value={dateStr}
        onChange={(val) => {
          setDateStr(val);
          if (val.length >= 8) handleConvert(val, mode);
        }}
      />

      {result && <Form.Description title="Result" text={result} />}

      <Form.Description text="Tip: You can use / or - or . as separators (e.g., 20/01/2080)" />
    </Form>
  );
}

function ReminderForm({ initialDate }: { initialDate?: Date }) {
  // Generate a truly unique session ID to bypass any hidden Raycast form caching
  const sessionPrefix = useMemo(
    () => Math.random().toString(36).substring(2, 9),
    [],
  );

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [timeText, setTimeText] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  });

  const baseDate = useMemo(
    () => (initialDate ? new Date(initialDate) : new Date()),
    [initialDate],
  );

  const parsedTime = useMemo(() => {
    try {
      const match = timeText.match(/^(\d{1,2})[:.]?(\d{2})?\s*(am|pm)?$/i);
      if (!match) return null;

      let hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const ampm = match[3]?.toLowerCase();

      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

      const d = new Date(baseDate);
      d.setHours(hours, minutes, 0, 0);
      return d;
    } catch {
      return null;
    }
  }, [timeText, baseDate]);

  const nepaliDateDisplay = useMemo(() => {
    const target = parsedTime || baseDate;
    const bs = adToBs(
      target.getFullYear(),
      target.getMonth() + 1,
      target.getDate(),
    );
    return formatBsDateNp(bs);
  }, [parsedTime, baseDate]);

  const englishDateDisplay = useMemo(() => {
    const target = parsedTime || baseDate;
    return `${formatAdDate(target)}${parsedTime ? ` at ${parsedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}` : ""}`;
  }, [parsedTime, baseDate]);

  const handleSubmit = async () => {
    if (!parsedTime) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Time",
        message: "Please enter time in format HH:MM AM/PM",
      });
      return;
    }

    const timeStr = parsedTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const eventTitle = title || "Untitled Event";
    const finalNotes = notes.trim();

    try {
      const appleScript = `
        tell application "Reminders"
          set theDate to current date
          set day of theDate to ${parsedTime.getDate()}
          set month of theDate to ${parsedTime.getMonth() + 1}
          set year of theDate to ${parsedTime.getFullYear()}
          set time of theDate to (${parsedTime.getHours()} * 3600 + ${parsedTime.getMinutes()} * 60)
          
          make new reminder with properties {name:"${eventTitle}", due date:theDate, body:"${finalNotes.replace(/"/g, '\\"')}"}
        end tell
      `;
      await runAppleScript(appleScript);
      await popToRoot();
      await showHUD(`✅ Reminder Scheduled: ${eventTitle} at ${timeStr}`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Reminder",
        message: String(error),
      });
    }
  };

  return (
    <Form
      key={sessionPrefix}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Reminder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={`title-${sessionPrefix}`}
        title="Event Name"
        placeholder="e.g. Dashain Tika"
        value={title}
        onChange={setTitle}
      />
      <Form.Description title="Selected Nepali Date" text={nepaliDateDisplay} />
      <Form.Description title="Reminder Schedule" text={englishDateDisplay} />
      <Form.TextField
        id={`time-${sessionPrefix}`}
        title="Time"
        placeholder="e.g. 9:30 AM"
        value={timeText}
        onChange={setTimeText}
        info="Type time with AM/PM (e.g., 9:30 AM, 2 PM, 14:00)"
      />
      {!parsedTime && timeText && (
        <Form.Description text="⚠️ Invalid time format (e.g. 9:30 AM)" />
      )}
      <Form.TextArea
        id={`notes-${sessionPrefix}`}
        title="Notes"
        placeholder="Additional details..."
        value={notes}
        onChange={setNotes}
      />
    </Form>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const [searchText, setSearchText] = useState("");

  // Calendar view state
  const today = useMemo(() => getTodayBs(), []);
  const [viewDate, setViewDate] = useState<BsDate>(today);

  const tithi = getCurrentTithi();
  const adDate = bsToAd(today.year, today.month, today.day);

  const nextMonth = () => {
    setViewDate((prev) => {
      let m = prev.month + 1;
      let y = prev.year;
      if (m > 12) {
        m = 1;
        y++;
      }
      return { year: y, month: m, day: 1 };
    });
  };

  const prevMonth = () => {
    setViewDate((prev) => {
      let m = prev.month - 1;
      let y = prev.year;
      if (m === 0) {
        m = 12;
        y--;
      }
      return { year: y, month: m, day: 1 };
    });
  };

  const dashboardDetailMarkdown = `${generateCalendarSvg(viewDate.year, viewDate.month, today)}

---

| **Vedic Almanac (Today)** | |
| :--- | :--- |
| **Bikram Sambat** | ${formatBsDate(today)} (${formatBsDateNp(today)}) |
| **English Date** | ${formatAdDate(adDate)} |
| **Lunar Tithi** | ${tithi.paksha} ${tithi.name} |
`;

  return (
    <List
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type a date (e.g. 15) to jump to a day..."
    >
      {/* ── Interactive Day Browser (Top Priority on Numeric Search) ── */}
      {searchText && /^\d+$/.test(searchText) && (
        <List.Section title={`Jump to ${BS_MONTH_NAMES[viewDate.month - 1]}`}>
          {Array.from({ length: 32 }, (_, i) => i + 1)
            .filter((d) => {
              const daysInMonth = getBsMonthDays(viewDate.year, viewDate.month);
              return d <= daysInMonth && d === parseInt(searchText);
            })
            .map((d) => {
              try {
                const date = {
                  year: viewDate.year,
                  month: viewDate.month,
                  day: d,
                };
                const dow = getBsDayOfWeek(date.year, date.month, date.day);
                const ad = bsToAd(date.year, date.month, date.day);
                return (
                  <List.Item
                    key={`jump-day-${d}`}
                    title={`${d} ${BS_MONTH_NAMES[viewDate.month - 1]} (${WEEKDAY_NAMES_NP[dow]})`}
                    icon={{ source: Icon.BullsEye, tintColor: Color.Green }}
                    detail={
                      <List.Item.Detail
                        markdown={`${generateCalendarSvg(viewDate.year, viewDate.month, today, d)}

---

| **Vedic Almanac** | ${d} ${BS_MONTH_NAMES[viewDate.month - 1]} |
| :--- | :--- |
| **Bikram Sambat** | ${formatBsDate(date)} |
| **English Date** | ${formatAdDate(ad)} |
| **Lunar Tithi** | ${tithi.paksha} ${tithi.name} |
`}
                      />
                    }
                    accessories={[
                      {
                        icon: Icon.Bell,
                        tooltip: "Press Cmd + Enter to set a reminder",
                      },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title="Copy Nepali Date"
                          content={formatBsDateNp(date)}
                        />
                        <Action.Push
                          title="Set Reminder"
                          target={<ReminderForm initialDate={ad} />}
                          icon={Icon.Bell}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        />
                        <ActionPanel.Section title="Navigation">
                          <Action
                            title="Next Month"
                            icon={Icon.ArrowRight}
                            shortcut={{
                              modifiers: ["cmd"],
                              key: "arrowRight",
                            }}
                            onAction={nextMonth}
                          />
                          <Action
                            title="Previous Month"
                            icon={Icon.ArrowLeft}
                            shortcut={{
                              modifiers: ["cmd"],
                              key: "arrowLeft",
                            }}
                            onAction={prevMonth}
                          />
                          <Action
                            title="Back to Today"
                            icon={Icon.BullsEye}
                            shortcut={{ modifiers: ["cmd"], key: "t" }}
                            onAction={() => setViewDate(today)}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              } catch {
                return null;
              }
            })}
        </List.Section>
      )}

      {/* ── Tab: Dashboard ── */}
      {
        <List.Section title="Main">
          <List.Item
            title={`Today: ${WEEKDAY_NAMES_NP[getBsDayOfWeek(today.year, today.month, today.day)]}, ${formatBsDateNp(today)}`}
            icon={{ source: Icon.Calendar, tintColor: Color.Green }}
            detail={
              <List.Item.Detail
                markdown={`${generateCalendarSvg(viewDate.year, viewDate.month, today, viewDate.year === today.year && viewDate.month === today.month ? today.day : undefined)}

---

| **Vedic Almanac (Today)** | |
| :--- | :--- |
| **Bikram Sambat** | ${formatBsDate(today)} (${formatBsDateNp(today)}) |
| **English Date** | ${formatAdDate(adDate)} |
| **Lunar Tithi** | ${tithi.paksha} ${tithi.name} |
`}
              />
            }
            accessories={[
              {
                icon: Icon.Bell,
                tooltip: "Press Cmd + Shift + R to set a reminder",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Nepali Date"
                  content={formatBsDateNp(today)}
                />
                <Action.Push
                  title="Set Reminder"
                  target={
                    <ReminderForm key={Date.now()} initialDate={adDate} />
                  }
                  icon={Icon.Bell}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
                <ActionPanel.Section title="Navigation">
                  <Action
                    title="Next Month"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                    onAction={nextMonth}
                  />
                  <Action
                    title="Previous Month"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                    onAction={prevMonth}
                  />
                  <Action
                    title="Back to Today"
                    icon={Icon.BullsEye}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => setViewDate(today)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
          <List.Item
            title="Convert Date"
            icon={{ source: Icon.Repeat, tintColor: Color.SecondaryText }}
            detail={<List.Item.Detail markdown={dashboardDetailMarkdown} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Convert Date"
                  target={<ConverterForm />}
                  icon={Icon.Repeat}
                />
                <ActionPanel.Section title="Navigation">
                  <Action
                    title="Next Month"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                    onAction={nextMonth}
                  />
                  <Action
                    title="Previous Month"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                    onAction={prevMonth}
                  />
                  <Action
                    title="Back to Today"
                    icon={Icon.BullsEye}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => setViewDate(today)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />

          <List.Item
            title="Set Reminder"
            icon={{ source: Icon.Bell, tintColor: Color.SecondaryText }}
            detail={<List.Item.Detail markdown={dashboardDetailMarkdown} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Set Reminder"
                  target={<ReminderForm />}
                  icon={Icon.Bell}
                />
                <ActionPanel.Section title="Navigation">
                  <Action
                    title="Next Month"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                    onAction={nextMonth}
                  />
                  <Action
                    title="Previous Month"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                    onAction={prevMonth}
                  />
                  <Action
                    title="Back to Today"
                    icon={Icon.BullsEye}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => setViewDate(today)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      }
    </List>
  );
}
