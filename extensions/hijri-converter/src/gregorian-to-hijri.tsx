import { ActionPanel, Action, Form, Clipboard, showHUD, popToRoot, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  GREGORIAN_MONTHS,
  convertGregorianToHijri,
  formatHijriDate,
  getTodayGregorian,
  getDayName,
  GregorianDate,
  getGregorianDaysInMonth,
  isValidGregorianDate,
  validateGregorianDate,
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

  const parseInteger = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return NaN;
    const number = Number(trimmed);
    return Number.isInteger(number) && Number.isSafeInteger(number) ? number : NaN;
  };

  const parsedDay = parseInteger(day);
  const parsedMonth = parseInteger(month);
  const parsedYear = parseInteger(year);

  const yearError = !Number.isFinite(parsedYear)
    ? "Year must be a whole number"
    : parsedYear < 1
      ? "Year must be 1 or later"
      : "";
  const monthError = !Number.isFinite(parsedMonth)
    ? "Month must be a whole number"
    : parsedMonth < 1 || parsedMonth > 12
      ? "Month must be between 1 and 12"
      : "";
  const dayError = !Number.isFinite(parsedDay)
    ? "Day must be a whole number"
    : monthError || yearError
      ? ""
      : !isValidGregorianDate({ year: parsedYear, month: parsedMonth, day: parsedDay })
        ? "Day is out of range for this month"
        : "";

  // Update preview whenever inputs change
  useEffect(() => {
    if (yearError || monthError || dayError) {
      setPreview("");
      setDayName("");
      return;
    }

    try {
      const gregorian: GregorianDate = { year: parsedYear, month: parsedMonth, day: parsedDay };
      const hijri = convertGregorianToHijri(gregorian);
      const dayInfo = getDayName(gregorian);
      setPreview(formatHijriDate(hijri));
      setDayName(dayInfo);
    } catch {
      setPreview("");
      setDayName("");
    }
  }, [dayError, monthError, parsedDay, parsedMonth, parsedYear, yearError]);

  useEffect(() => {
    if (!Number.isFinite(parsedDay) || !Number.isFinite(parsedMonth) || !Number.isFinite(parsedYear)) return;
    if (parsedMonth < 1 || parsedMonth > 12) return;
    if (parsedYear < 1) return;

    const max = getGregorianDaysInMonth(parsedYear, parsedMonth);
    if (parsedDay > max) {
      setDay(String(max));
    }
  }, [parsedDay, parsedMonth, parsedYear]);

  async function handleSubmit() {
    if (yearError || monthError || dayError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Date",
        message: yearError || monthError || dayError,
      });
      return;
    }

    try {
      const gregorian: GregorianDate = { year: parsedYear, month: parsedMonth, day: parsedDay };
      const error = validateGregorianDate(gregorian);
      if (error) {
        await showToast({ style: Toast.Style.Failure, title: "Invalid Date", message: error });
        return;
      }
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

  const daysInMonth =
    Number.isFinite(parsedYear) &&
    parsedYear >= 1 &&
    Number.isFinite(parsedMonth) &&
    parsedMonth >= 1 &&
    parsedMonth <= 12
      ? getGregorianDaysInMonth(parsedYear, parsedMonth)
      : 31;
  const dayOptions = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert & Copy" icon={Icon.Clipboard} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="day" title="Day" value={day} onChange={setDay} error={dayError || undefined}>
        {dayOptions.map((value) => (
          <Form.Dropdown.Item key={value} value={String(value)} title={String(value)} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="month" title="Month" value={month} onChange={setMonth} error={monthError || undefined}>
        {GREGORIAN_MONTHS.map((m) => (
          <Form.Dropdown.Item key={m.value} value={m.value} title={m.name} keywords={[m.value]} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="year" title="Year" value={year} onChange={setYear} error={yearError || undefined} />

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
