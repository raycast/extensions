import { Action, ActionPanel, Detail, Form, showToast, Toast, useNavigation } from "@raycast/api";
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
    const y = parseNumber(year);
    const m = parseNumber(month);
    const d = parseNumber(day);
    if (y === null || m === null || d === null) {
      void showToast({
        style: Toast.Style.Failure,
        title: "ورودی نامعتبر",
        message: "سال، ماه و روز را با عدد وارد کنید.",
      });
      return;
    }

    try {
      let jy: number, jm: number, jd: number;
      let gy: number, gm: number, gd: number;

      if (direction === "jalali-to-gregorian") {
        if (!isValidJalaaliDate(y, m, d)) throw new Error("تاریخ شمسی نامعتبر است.");
        jy = y;
        jm = m;
        jd = d;
        ({ gy, gm, gd } = toGregorian(jy, jm, jd));
      } else {
        if (!validGregorian(y, m, d)) throw new Error("تاریخ میلادی نامعتبر است (سال ۱۰۰۰ تا ۳۰۰۰).");
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
          navigationTitle="نتیجه تبدیل تاریخ"
          markdown={`# نتیجه تبدیل تاریخ\n\n**شمسی:** ${persian}\n\n**میلادی:** ${gregorian}\n\n**روز هفته:** ${weekday}\n\n**تاریخ کامل شمسی:** ${faDigits(jd)} ${MONTH_NAMES[jm - 1]} ${faDigits(jy)}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="کپی تاریخ شمسی" content={persian} />
              <Action.CopyToClipboard title="کپی تاریخ میلادی" content={gregorian} />
            </ActionPanel>
          }
        />,
      );
    } catch (error) {
      void showToast({
        style: Toast.Style.Failure,
        title: "امکان تبدیل این تاریخ نیست",
        message: error instanceof Error ? error.message : "تاریخ ورودی را بررسی کنید.",
      });
    }
  }

  return (
    <Form
      navigationTitle="تبدیل تاریخ شمسی و میلادی"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="تبدیل تاریخ" onSubmit={convert} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="direction" title="نوع تبدیل" value={direction} onChange={changeDirection}>
        <Form.Dropdown.Item value="jalali-to-gregorian" title="شمسی به میلادی" />
        <Form.Dropdown.Item value="gregorian-to-jalali" title="میلادی به شمسی" />
      </Form.Dropdown>
      <Form.TextField id="year" title="سال" placeholder="مثلاً ۱۴۰۵" value={year} onChange={setYear} />
      <Form.TextField id="month" title="ماه" placeholder="۱ تا ۱۲" value={month} onChange={setMonth} />
      <Form.TextField id="day" title="روز" placeholder="۱ تا ۳۱" value={day} onChange={setDay} />
      <Form.Description text="می‌توانید اعداد فارسی یا انگلیسی وارد کنید. محاسبات بدون اینترنت انجام می‌شود." />
    </Form>
  );
}
