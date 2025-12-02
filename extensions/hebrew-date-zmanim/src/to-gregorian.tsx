import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { JewishCalendar, Parsha, Calendar } from "kosher-zmanim";

const HEBREW_MONTHS = [
  { name: "Nissan", value: 1 },
  { name: "Iyar", value: 2 },
  { name: "Sivan", value: 3 },
  { name: "Tammuz", value: 4 },
  { name: "Av", value: 5 },
  { name: "Elul", value: 6 },
  { name: "Tishrei", value: 7 },
  { name: "Cheshvan", value: 8 },
  { name: "Kislev", value: 9 },
  { name: "Tevet", value: 10 },
  { name: "Shevat", value: 11 },
  { name: "Adar", value: 12 },
  { name: "Adar II", value: 13 },
];

export default function Command() {
  // Get today's Hebrew date as defaults
  const todayHebrew = new JewishCalendar();
  todayHebrew.setGregorianDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const [day, setDay] = useState<string>(todayHebrew.getJewishDayOfMonth().toString());
  const [month, setMonth] = useState<string>(todayHebrew.getJewishMonth().toString());
  const [year, setYear] = useState<string>(todayHebrew.getJewishYear().toString());
  const { push } = useNavigation();

  function createHebrewDate(): JewishCalendar | null {
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return null;
    if (dayNum < 1 || dayNum > 30) return null;
    if (yearNum < 1) return null;

    try {
      const jc = new JewishCalendar();
      jc.setJewishDate(yearNum, monthNum, dayNum);
      return jc;
    } catch {
      return null;
    }
  }

  function convert() {
    const jc = createHebrewDate();
    if (!jc) {
      push(
        <Detail
          markdown={`# Hebrew → Gregorian

**Error:** Invalid Hebrew date: ${day} ${HEBREW_MONTHS.find((m) => m.value.toString() === month)?.name} ${year}

Please check that:
- Day is between 1-30
- Month is selected
- Year is a valid Hebrew year (e.g., 5785)`}
        />,
      );
      return;
    }

    const y = jc.getGregorianYear();
    const m = jc.getGregorianMonth() + 1; // kosher-zmanim uses 0-based months
    const d = jc.getGregorianDayOfMonth();
    const gregorianDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const date = new Date(y, jc.getGregorianMonth(), d);

    // Get additional information
    const dayNames = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = dayNames[jc.getDayOfWeek()];

    // Get parsha info - only relevant for Saturday
    const parshaNum = jc.getParsha();
    let parshaInfo = "";
    if (jc.getDayOfWeek() === Calendar.SATURDAY) {
      // Saturday
      parshaInfo = parshaNum > 0 ? Parsha[parshaNum].replace(/_/g, " ") : "None";
    } else {
      // For other days, find the upcoming Saturday's parsha
      const nextSat = new JewishCalendar();
      nextSat.setJewishDate(jc.getJewishYear(), jc.getJewishMonth(), jc.getJewishDayOfMonth());
      const daysToSat = (7 - nextSat.getDayOfWeek()) % 7;
      if (daysToSat === 0 && nextSat.getDayOfWeek() !== Calendar.SATURDAY) {
        // If today is not Saturday, add 7 days
        nextSat.forward(Calendar.DATE, 7);
      } else if (daysToSat > 0) {
        nextSat.forward(Calendar.DATE, daysToSat);
      }
      const nextParshaNum = nextSat.getParsha();

      parshaInfo = nextParshaNum > 0 ? `${Parsha[nextParshaNum].replace(/_/g, " ")} (On Shabbat)` : "None this week";
    }

    // Get special information
    const specialInfo = [];
    if (jc.isRoshChodesh()) specialInfo.push("Rosh Chodesh");
    if (jc.isChanukah()) specialInfo.push(`Chanukah Day ${jc.getDayOfChanukah()}`);
    if (jc.isYomTov()) specialInfo.push("Yom Tov");
    if (jc.isTaanis()) specialInfo.push("Taanit");
    if (jc.getDayOfOmer() > 0) specialInfo.push(`Omer Day ${jc.getDayOfOmer()}`);

    const inputDisplay = `${day} ${HEBREW_MONTHS.find((m) => m.value.toString() === month)?.name} ${year}`;
    const lines = [
      `**Input:** ${inputDisplay}`,
      `**Gregorian Date:** ${gregorianDate}`,
      `**Day of Week:** ${dayOfWeek}`,
      `**Torah Portion:** ${parshaInfo}`,
    ];

    if (specialInfo.length > 0) {
      lines.push(`**Special Day:** ${specialInfo.join(", ")}`);
    }

    lines.push("", "> Note: This returns the civil daytime date. Hebrew days begin at sunset.");

    push(
      <Detail
        markdown={`# Hebrew → Gregorian\n\n${lines.join("\n\n")}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Date (Yyyy-Mm-Dd)" content={gregorianDate} />
            <Action.CopyToClipboard title="Copy Day of Week" content={dayOfWeek} />
            <Action.CopyToClipboard title="Copy Torah Portion" content={parshaInfo} />
            <Action.CopyToClipboard title="Copy Iso Date" content={date.toISOString()} icon={Icon.Clipboard} />
          </ActionPanel>
        }
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={convert} icon={Icon.ArrowRight} />
        </ActionPanel>
      }
    >
      <Form.TextField id="day" title="Day" placeholder="1-30" value={day} onChange={setDay} />
      <Form.Dropdown id="month" title="Hebrew Month" value={month} onChange={setMonth}>
        {HEBREW_MONTHS.map((m) => (
          <Form.Dropdown.Item key={m.value} value={m.value.toString()} title={m.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="year" title="Hebrew Year" placeholder="e.g., 5785" value={year} onChange={setYear} />
      <Form.Description text="Enter a Hebrew date to convert to Gregorian. Defaults to today's Hebrew date." />
    </Form>
  );
}
