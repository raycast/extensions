import { ActionPanel, Action, Form, Clipboard, showHUD, popToRoot, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  GREGORIAN_MONTHS,
  convertGregorianToHijri,
  formatHijriDate,
  getTodayGregorian,
  getDayName,
  GregorianDate,
} from "./utils";

export default function Command() {
  // Default to today's date for convenience
  const today = getTodayGregorian();

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

    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d > 0 && d <= 31 && y > 0) {
      try {
        const gregorian: GregorianDate = { year: y, month: m, day: d };
        const hijri = convertGregorianToHijri(gregorian);
        const dayInfo = getDayName(gregorian);
        setPreview(formatHijriDate(hijri));
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
      const gregorian: GregorianDate = { year: y, month: m, day: d };
      const hijri = convertGregorianToHijri(gregorian);
      const result = formatHijriDate(hijri);

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
        {GREGORIAN_MONTHS.map((m) => (
          <Form.Dropdown.Item key={m.value} value={m.value} title={m.name} keywords={[m.value]} />
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
