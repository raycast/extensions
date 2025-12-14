import { ActionPanel, Action, Form, showToast, Toast, Clipboard, showHUD, popToRoot, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  HIJRI_MONTHS,
  convertHijriToGregorian,
  formatGregorianDate,
  getTodayHijri,
  getDayName,
  HijriDate,
} from "./utils";

export default function Command() {
  // Default to today's Hijri date for convenience
  const today = getTodayHijri();

  const [day, setDay] = useState<string>(String(today.day));
  const [month, setMonth] = useState<string>(String(today.month));
  const [year, setYear] = useState<string>(String(today.year));

  // Live preview
  const [preview, setPreview] = useState<string>("");
  const [dayName, setDayName] = useState<string>("");

  // Update preview whenever inputs change
  useEffect(() => {
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);

    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d > 0 && d <= 30 && y > 0) {
      try {
        const hijri: HijriDate = { year: y, month: m, day: d };
        const gregorian = convertHijriToGregorian(hijri);
        const dayInfo = getDayName(gregorian);
        setPreview(formatGregorianDate(gregorian));
        setDayName(dayInfo);
      } catch {
        setPreview("");
        setDayName("");
      }
    } else {
      setPreview("");
      setDayName("");
    }
  }, [day, month, year]);

  async function handleSubmit() {
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);

    if (isNaN(d) || isNaN(m) || isNaN(y)) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid Date" });
      return;
    }

    try {
      const hijri: HijriDate = { year: y, month: m, day: d };
      const gregorian = convertHijriToGregorian(hijri);
      const result = formatGregorianDate(gregorian);

      // Auto-copy to clipboard
      await Clipboard.copy(result);

      // Show HUD and close
      await showHUD(`${result} (copied!)`);
      await popToRoot();
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Conversion Error" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert & Copy" icon={Icon.Clipboard} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="day" title="Day" value={day} onChange={setDay} />

      <Form.Dropdown id="month" title="Month" value={month} onChange={setMonth}>
        {HIJRI_MONTHS.map((m) => (
          <Form.Dropdown.Item key={m.value} value={m.value} title={`${m.value} - ${m.name}`} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="year" title="Year" value={year} onChange={setYear} />

      {preview && (
        <>
          <Form.Separator />
          <Form.Description title="Result" text={preview} />
          <Form.Description title="Day" text={dayName} />
        </>
      )}
    </Form>
  );
}
