import { ActionPanel, Action, Form, showToast, Toast, Clipboard, showHUD, popToRoot, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  HIJRI_MONTHS,
  convertHijriToGregorian,
  formatGregorianDate,
  getTodayHijri,
  getDayName,
  HijriDate,
  isValidHijriDay,
  isValidHijriMonth,
  isValidHijriYear,
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
    : !isValidHijriYear(parsedYear)
      ? "Year must be 1 or later"
      : "";
  const monthError = !Number.isFinite(parsedMonth)
    ? "Month must be a whole number"
    : !isValidHijriMonth(parsedMonth)
      ? "Month must be between 1 and 12"
      : "";
  const dayError = !Number.isFinite(parsedDay)
    ? "Day must be a whole number"
    : monthError
      ? ""
      : !isValidHijriDay(parsedDay, parsedMonth)
        ? "Day is out of range for this Hijri month"
        : "";
  // Update preview whenever inputs change
  useEffect(() => {
    if (yearError || monthError || dayError) {
      setPreview("");
      setDayName("");
      return;
    }

    try {
      const hijri: HijriDate = { year: parsedYear, month: parsedMonth, day: parsedDay };
      const gregorian = convertHijriToGregorian(hijri);
      const dayInfo = getDayName(gregorian);
      setPreview(formatGregorianDate(gregorian));
      setDayName(dayInfo);
    } catch {
      setPreview("");
      setDayName("");
    }
  }, [dayError, monthError, parsedDay, parsedMonth, parsedYear, yearError]);

  useEffect(() => {
    if (!Number.isFinite(parsedDay) || !Number.isFinite(parsedMonth)) return;
    if (!isValidHijriMonth(parsedMonth)) return;
    if (!isValidHijriDay(parsedDay, parsedMonth)) {
      const max = parsedMonth === 12 ? 30 : parsedMonth % 2 === 1 ? 30 : 29;
      setDay(String(max));
    }
  }, [parsedDay, parsedMonth]);

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
      const hijri: HijriDate = { year: parsedYear, month: parsedMonth, day: parsedDay };
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

  const maxDay =
    Number.isFinite(parsedMonth) && isValidHijriMonth(parsedMonth)
      ? parsedMonth === 12
        ? 30
        : parsedMonth % 2 === 1
          ? 30
          : 29
      : 30;
  const dayOptions = Array.from({ length: maxDay }, (_, index) => index + 1).filter((value) =>
    isValidHijriDay(value, parsedMonth || 1),
  );

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
        {HIJRI_MONTHS.map((m) => (
          <Form.Dropdown.Item key={m.value} value={m.value} title={`${m.value} - ${m.name}`} />
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
