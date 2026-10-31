import { Action, ActionPanel, getSelectedText, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { openSetupOnFirstRun } from "./lib/onboarding";
import { toLatinDigits, toPersianDigits } from "./lib/persian";
import {
  formatGregorian,
  formatJalali,
  formatNumericDate,
  groupDigits,
  numberToWords,
  parseDate,
  parseNumber,
  SimpleDate,
  today,
  toGregorian,
  toJalali,
  weekdayFa,
} from "./lib/persian-tools";

interface Row {
  title: string;
  value: string;
  icon: Icon;
  warning?: boolean;
}

function dateRows(jalali: SimpleDate, gregorian: SimpleDate): Row[] {
  return [
    { title: "تاریخ شمسی", value: `${weekdayFa(gregorian)} ${formatJalali(jalali)}`, icon: Icon.Calendar },
    { title: "Jalali", value: formatNumericDate(jalali), icon: Icon.Calendar },
    { title: "Jalali (Persian digits)", value: formatNumericDate(jalali, true), icon: Icon.Calendar },
    { title: "Gregorian", value: formatGregorian(gregorian), icon: Icon.Calendar },
    { title: "Gregorian (ISO)", value: formatNumericDate(gregorian).replaceAll("/", "-"), icon: Icon.Calendar },
  ];
}

function rowsFor(input: string): Row[] {
  const text = input.trim();
  if (!text) {
    const g = today();
    return dateRows(toJalali(g), g);
  }

  const date = parseDate(text);
  if (date) {
    const gregorian = date.calendar === "jalali" ? toGregorian(date.date) : date.date;
    if (gregorian) return dateRows(date.calendar === "jalali" ? date.date : toJalali(gregorian), gregorian);
  }

  const rows: Row[] = [];
  const words = numberToWords(text);
  if (words) {
    rows.push({ title: "به حروف", value: words, icon: Icon.Text });
    rows.push({ title: "With separators", value: groupDigits(text, false) ?? text, icon: Icon.Hashtag });
    rows.push({ title: "با جداکننده", value: groupDigits(text, true) ?? text, icon: Icon.Hashtag });
  } else if (parseNumber(text)) {
    rows.push({
      title: "به حروف",
      value: "This number is too large or too precise to write in words",
      icon: Icon.Warning,
      warning: true,
    });
    const latinGrouped = groupDigits(text, false);
    const persianGrouped = groupDigits(text, true);
    if (latinGrouped) rows.push({ title: "With separators", value: latinGrouped, icon: Icon.Hashtag });
    if (persianGrouped) rows.push({ title: "با جداکننده", value: persianGrouped, icon: Icon.Hashtag });
  }
  const persian = toPersianDigits(text);
  const latin = toLatinDigits(text);
  if (persian !== text) rows.push({ title: "Persian digits", value: persian, icon: Icon.Hashtag });
  if (latin !== text) rows.push({ title: "Latin digits", value: latin, icon: Icon.Hashtag });
  return rows;
}

export default function Command() {
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    openSetupOnFirstRun();
    getSelectedText()
      .then((text) => {
        if (text.trim().length < 40) setSearch(text.trim());
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const rows = useMemo(() => rowsFor(search), [search]);

  return (
    <List
      isLoading={!ready}
      filtering={false}
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="A number, or a date like 1405/08/06 or 2026-10-28"
    >
      <List.EmptyView
        icon={Icon.Calculator}
        title="Type a number or a date"
        description="۱۲۵ → صد و بیست و پنج · 1405/08/06 → Gregorian · 2026-10-28 → شمسی"
      />
      {rows.map((row) => (
        <List.Item
          key={row.title}
          title={row.value}
          subtitle={row.title}
          icon={row.icon}
          actions={
            row.warning ? undefined : (
              <ActionPanel>
                <Action.Paste content={row.value} />
                <Action.CopyToClipboard content={row.value} />
              </ActionPanel>
            )
          }
        />
      ))}
    </List>
  );
}
