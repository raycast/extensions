import { ActionPanel, CopyToClipboardAction, Detail, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { Calendar } from "calendar";

const days = [
  "\`SUN\` \`MON\` \`TUE\` \`WED\` \`THU\` \`FRI\` \`SAT\`",
  "\`MON\` \`TUE\` \`WED\` \`THU\` \`FRI\` \`SAT\` \`SUN\`"
]

const weekStart = Number(getPreferenceValues().weekStart)

export default function main() {
  const [calendar, setCalendar] = useState("")
  const [header, setHeader] = useState("")
  const [date, setDate] = useState(new Date())

  useEffect(() => {
    (async () => {
      const cal = new Calendar(weekStart)
      const m = cal.monthDays(date.getFullYear(), date.getMonth())

      let table = ""
      m.forEach((week) => {
        week.forEach((day) => {
          if (day == 0) {
            table += "\`   \` "
          }
          if (day > 0 && day < 10) {
            table += "\`  " + day + "\` "
          }
          if (day >= 10) {
            table += "\` " + day + "\` "
          }
        })
        table += "\n\n"
      })

      const header = date.toLocaleString('en', { month: 'long', year: 'numeric' });
      setHeader(header)
      setCalendar("# " + header + "\n***\n" + days[weekStart] + "\n\n" + table)
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

  return <Detail
    markdown={calendar}
    navigationTitle={header}
    actions={
      <ActionPanel>
        <ActionPanel.Section title={header}>
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
