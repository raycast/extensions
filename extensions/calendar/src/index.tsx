import { ActionPanel, CopyToClipboardAction, Detail, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { Calendar } from "calendar";
import { weekNumber } from 'weeknumber';

const days = [
  "`SUN` `MON` `TUE` `WED` `THU` `FRI` `SAT`",
  "`MON` `TUE` `WED` `THU` `FRI` `SAT` `SUN`"
]

const weekStart = Number(getPreferenceValues().weekStart)
const showWeeks = getPreferenceValues().showWeeks
const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

export default function main() {
  const [calendar, setCalendar] = useState("")
  const [header, setHeader] = useState("")
  const [date, setDate] = useState(currentMonth)

  useEffect(() => {
    (async () => {
      const cal = new Calendar(weekStart)
      const m = cal.monthDates(date.getFullYear(), date.getMonth())

      let table = ""
      m.forEach((week) => {
        if (showWeeks) {
          const wn = weekNumber(week[0])
          if (wn < 10) {
            table += "`" + wn + "  `    "
          } else {
            table += "`" + wn + " `    "
          }
        }

        week.forEach((day) => {
          const dayNum = day.getMonth() === date.getMonth() ? day.getDate() : 0;
          if (dayNum == 0) {
            table += "`   ` "
          }
          if (dayNum > 0 && dayNum < 10) {
            table += "`  " + dayNum + "` "
          }
          if (dayNum >= 10) {
            table += "` " + dayNum + "` "
          }
        })
        table += "\n\n"
      })

      const header = date.toLocaleString('en', { month: 'long', year: 'numeric' })
      const weeksHeader = showWeeks ? "`#  `    " : ""
      setHeader(header)
      setCalendar("# " + header + "\n***\n" + weeksHeader + days[weekStart] + "\n\n" + table)
    })();
  }, [date]);

  const changeMonth = (change: number) => {
    let newDate = new Date(date.getFullYear(), date.getMonth() + change, 1)
    setDate(newDate)
  }

  const changeYear = (change: number) => {
    let newDate = new Date(date.getFullYear() + change, date.getMonth(), 1)
    setDate(newDate)
  }

  const setCurrent = () => {
    setDate(currentMonth)
  }

  return <Detail
    markdown={calendar}
    navigationTitle={header}
    actions={
      <ActionPanel>
        <ActionPanel.Section title={header}>
          <ActionPanel.Item
            title="Current Month"
            shortcut={{ modifiers: [], key: "c" }}
            onAction={() => setCurrent()}
          />
          <CopyToClipboardAction content={calendar} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Change Month">
          <ActionPanel.Item
            title="Previous Month"
            shortcut={{ modifiers: [], key: "arrowLeft" }}
            onAction={() => changeMonth(-1)}
          />
          <ActionPanel.Item
            title="Next Month"
            shortcut={{ modifiers: [], key: "arrowRight" }}
            onAction={() => changeMonth(1)}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Change Year">
          <ActionPanel.Item
            title="Previous Year"
            shortcut={{ modifiers: ["shift"], key: "arrowLeft" }}
            onAction={() => changeYear(-1)}
          />
          <ActionPanel.Item
            title="Next Year"
            shortcut={{ modifiers: ["shift"], key: "arrowRight" }}
            onAction={() => changeYear(1)}
          />
        </ActionPanel.Section>
      </ActionPanel>
    }
  />;
}
