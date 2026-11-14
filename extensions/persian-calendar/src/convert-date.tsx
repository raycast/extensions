import { Action, ActionPanel, Detail, Form, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { isValidJalaaliDate } from "jalaali-js";
import {
  englishDigits,
  faDigits,
  getIranToday,
  gregorianText,
  jalaliText,
  MONTH_NAMES,
  toGregorian,
  toJalaali,
  weekdayIndex,
  WEEKDAYS,
} from "./jalali";

type Direction = "jalali-to-gregorian" | "gregorian-to-jalali";

function validGregorian(y: number, m: number, d: number): boolean {
  if (y < 1000 || y > 3000 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const value = new Date(Date.UTC(y, m - 1, d));
  return value.getUTCFullYear() === y && value.getUTCMonth() === m - 1 && value.getUTCDate() === d;
}

function parseNumber(value: string): number | null {
  const normalized = englishDigits(value.trim());
  return /^\d{1,4}$/.test(normalized) ? Number(normalized) : null;
}

export default function Command() {
  const { push } = useNavigation();
  const today = getIranToday();
  const [direction, setDirection] = useState<Direction>("jalali-to-gregorian");
  const [year, setYear] = useState(String(today.jy));
  const [month, setMonth] = useState(String(today.jm));
  const [day, setDay] = useState(String(today.jd));

  function changeDirection(value: string) {
    const next = value as Direction;
    setDirection(next);
    setYear(String(next === "jalali-to-gregorian" ? today.jy : today.gy));
    setMonth(String(next === "jalali-to-gregorian" ? today.jm : today.gm));
    setDay(String(next === "jalali-to-gregorian" ? today.jd : today.gd));
  }

  function convert() {
    try {
      const y = parseNumber(year);
      const m = parseNumber(month);
      const d = parseNumber(day);
      if (y === null || m === null || d === null) {
        throw new Error("Enter numbers for the year, month, and day.");
      }

      let jy: number, jm: number, jd: number;
      let gy: number, gm: number, gd: number;

      if (direction === "jalali-to-gregorian") {
        if (!isValidJalaaliDate(y, m, d)) throw new Error("Invalid Jalali date.");
        jy = y;
        jm = m;
        jd = d;
        ({ gy, gm, gd } = toGregorian(jy, jm, jd));
      } else {
        if (!validGregorian(y, m, d)) throw new Error("Invalid Gregorian date (year 1000–3000).");
        gy = y;
        gm = m;
        gd = d;
        ({ jy, jm, jd } = toJalaali(gy, gm, gd));
      }

      const persian = jalaliText(jy, jm, jd);
      const gregorian = gregorianText(gy, gm, gd);
      const weekday = WEEKDAYS[weekdayIndex(gy, gm, gd)];
      push(
        <Detail
          navigationTitle="Date Conversion Result"
          markdown={`# Date Conversion Result\n\n**Jalali:** ${persian}\n\n**Gregorian:** ${gregorian}\n\n**Weekday:** ${weekday}\n\n**Full Persian Date:** ${faDigits(jd)} ${MONTH_NAMES[jm - 1]} ${faDigits(jy)}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Jalali Date" content={persian} />
              <Action.CopyToClipboard title="Copy Gregorian Date" content={gregorian} />
            </ActionPanel>
          }
        />,
      );
    } catch (error) {
      void showFailureToast(error, { title: "Could Not Convert Date" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert Date" onSubmit={convert} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="direction" title="Conversion Direction" value={direction} onChange={changeDirection}>
        <Form.Dropdown.Item value="jalali-to-gregorian" title="Jalali to Gregorian" />
        <Form.Dropdown.Item value="gregorian-to-jalali" title="Gregorian to Jalali" />
      </Form.Dropdown>
      <Form.TextField id="year" title="Year" placeholder="e.g. 1405" value={year} onChange={setYear} />
      <Form.TextField id="month" title="Month" placeholder="1–12" value={month} onChange={setMonth} />
      <Form.TextField id="day" title="Day" placeholder="1–31" value={day} onChange={setDay} />
      <Form.Description text="Enter Persian or English numerals. Conversion works offline." />
    </Form>
  );
}
