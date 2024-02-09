import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Calendar } from "calendar";
import { weekNumber, weekNumberSun } from "weeknumber";

const days = [
  ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
  ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
];

const weekStart = Number(getPreferenceValues().weekStart);
const showWeeks = getPreferenceValues().showWeeks;
const viewMode = getPreferenceValues().viewMode;
const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

export default function main() {
  const [calendar, setCalendar] = useState("");
  const [header, setHeader] = useState("");
  const [date, setDate] = useState(currentMonth);

  useEffect(() => {
    const cal = new Calendar(weekStart);
    const m = cal.monthDates(date.getFullYear(), date.getMonth());
    const today = new Date().toDateString();
    const header = date.toLocaleString("en", { month: "long", year: "numeric" });
    const daysArray = days[weekStart];

    if (viewMode == 1) {
      const table = m
        .map((week) => {
          let row = showWeeks ? `| **${weekStart === 0 ? weekNumberSun(week[0]) : weekNumber(week[0])}** |` : "|";

          row += week
            .map((day) => {
              const dayString = day.getMonth() === date.getMonth() ? day.getDate().toString() : " ";
              const todayMarker = day.toDateString() === today && dayString !== " " ? "**• " : " ";
              return `${todayMarker}${dayString}${todayMarker !== " " ? "**" : ""} |`;
            })
            .join("");

          return `${row}\n`;
        })
        .join("");

      const weeksHeader = showWeeks ? "| **#** |" : "|";
      const daysHeader = daysArray.map((day) => `**${day}**`).join(" |");
      const separator = `${showWeeks ? "| :---: |" : "|"}${daysArray.map(() => ":---:").join(" |")}`;

      setHeader(header);
      setCalendar(`# ${header}\n${weeksHeader}${daysHeader} |\n${separator} |\n${table}`);
    } else {
      const table = m
        .map((week) => {
          let row = "";
          if (showWeeks) {
            let wn = "";
            if (weekStart == 0) {
              wn = weekNumberSun(week[0]).toString();
            } else {
              wn = weekNumber(week[0]).toString();
            }
            row += "`" + wn + " ".repeat(2 - wn.length) + "`    ";
          }

          row += week
            .map((day) => {
              const dayString = day.getMonth() === date.getMonth() ? day.getDate().toString() : "";
              if (day.toDateString() === today && dayString !== "") {
                return "`•" + " ".repeat(3 - dayString.length) + dayString + "` ";
              } else {
                return "`" + " ".repeat(4 - dayString.length) + dayString + "` ";
              }
            })
            .join("");

          return `${row}\n`;
        })
        .join("\n\n");

      const header = date.toLocaleString("en", { month: "long", year: "numeric" });
      const weeksHeader = showWeeks ? "`# `    " : "";
      const daysHeader = daysArray.map((day) => `\` ${day}\``).join(" ");

      setHeader(header);
      setCalendar("# " + header + "\n***\n" + weeksHeader + daysHeader + "\n\n" + table);
    }
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
      showToast(Toast.Style.Success, "Current month is on screen");
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
            <Action
              title="Current Month"
              shortcut={{ modifiers: [], key: "c" }}
              icon={{ source: { dark: "up-dark.png", light: "up.png" } }}
              onAction={() => setCurrent()}
            />
            <Action.CopyToClipboard content={calendar} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Change Month">
            <Action
              title="Previous Month"
              shortcut={{ modifiers: [], key: "arrowLeft" }}
              icon={{ source: { dark: "left-dark.png", light: "left.png" } }}
              onAction={() => changeMonth(-1)}
            />
            <Action
              title="Next Month"
              shortcut={{ modifiers: [], key: "arrowRight" }}
              icon={{ source: { dark: "right-dark.png", light: "right.png" } }}
              onAction={() => changeMonth(1)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Change Year">
            <Action
              title="Previous Year"
              shortcut={{ modifiers: ["shift"], key: "arrowLeft" }}
              icon={{ source: { dark: "double-left-dark.png", light: "double-left.png" } }}
              onAction={() => changeYear(-1)}
            />
            <Action
              title="Next Year"
              shortcut={{ modifiers: ["shift"], key: "arrowRight" }}
              icon={{ source: { dark: "double-right-dark.png", light: "double-right.png" } }}
              onAction={() => changeYear(1)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Open Extension Preferences"
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
