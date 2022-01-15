import { ActionPanel, CopyToClipboardAction, Detail, getPreferenceValues, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { Calendar } from "calendar";
import { weekNumber } from "weeknumber";

const days = ["` SUN` ` MON` ` TUE` ` WED` ` THU` ` FRI` ` SAT`", "` MON` ` TUE` ` WED` ` THU` ` FRI` ` SAT` ` SUN`"];

const weekStart = Number(getPreferenceValues().weekStart);
const showWeeks = getPreferenceValues().showWeeks;
const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

export default function main() {
  const [calendar, setCalendar] = useState("");
  const [header, setHeader] = useState("");
  const [date, setDate] = useState(currentMonth);

  useEffect(() => {
    (async () => {
      const cal = new Calendar(weekStart);
      const m = cal.monthDates(date.getFullYear(), date.getMonth());

      let table = "";
      m.forEach((week) => {
        if (showWeeks) {
          const wn = weekNumber(week[0]).toString();
          table += "`" + wn + " ".repeat(2 - wn.length) + "`    ";
        }

        week.forEach((day) => {
          const dayString = day.getMonth() === date.getMonth() ? day.getDate().toString() : "";
          if (day.toDateString() === new Date().toDateString()) {
            table += "`•" + " ".repeat(3 - dayString.length) + dayString + "` ";
          } else {
            table += "`" + " ".repeat(4 - dayString.length) + dayString + "` ";
          }
        });
        table += "\n\n";
      });

      const header = date.toLocaleString("en", { month: "long", year: "numeric" });
      const weeksHeader = showWeeks ? "`# `    " : "";
      setHeader(header);
      setCalendar("# " + header + "\n***\n" + weeksHeader + days[weekStart] + "\n\n" + table);
    })();
  }, [date]);

  const changeMonth = (change: number) => {
    const newDate = new Date(date.getFullYear(), date.getMonth() + change, 1);
    setDate(newDate);
  };

  const changeYear = (change: number) => {
    const newDate = new Date(date.getFullYear() + change, date.getMonth(), 1);
    setDate(newDate);
  };

  const setCurrent = () => {
    if (date === currentMonth) {
      showToast(ToastStyle.Success, "Current month is on screen");
    } else {
      setDate(currentMonth);
    }
  };

  return (
    <Detail
      markdown={calendar}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={header}>
            <ActionPanel.Item
              title="Current Month"
              shortcut={{ modifiers: [], key: "c" }}
              icon={{ source: { dark: "up-dark.png", light: "up.png" } }}
              onAction={() => setCurrent()}
            />
            <CopyToClipboardAction content={calendar} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Change Month">
            <ActionPanel.Item
              title="Previous Month"
              shortcut={{ modifiers: [], key: "arrowLeft" }}
              icon={{ source: { dark: "left-dark.png", light: "left.png" } }}
              onAction={() => changeMonth(-1)}
            />
            <ActionPanel.Item
              title="Next Month"
              shortcut={{ modifiers: [], key: "arrowRight" }}
              icon={{ source: { dark: "right-dark.png", light: "right.png" } }}
              onAction={() => changeMonth(1)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Change Year">
            <ActionPanel.Item
              title="Previous Year"
              shortcut={{ modifiers: ["shift"], key: "arrowLeft" }}
              icon={{ source: { dark: "double-left-dark.png", light: "double-left.png" } }}
              onAction={() => changeYear(-1)}
            />
            <ActionPanel.Item
              title="Next Year"
              shortcut={{ modifiers: ["shift"], key: "arrowRight" }}
              icon={{ source: { dark: "double-right-dark.png", light: "double-right.png" } }}
              onAction={() => changeYear(1)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
