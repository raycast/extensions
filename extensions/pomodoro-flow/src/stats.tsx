import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { loadCompletions } from "./stats-store";

const MIN_YEAR = 2020;
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function monthCalendar(
  year: number,
  month: number,
  counts: Map<string, number>,
) {
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: string[] = Array.from({ length: firstDay }, () => "    ");
  for (let day = 1; day <= days; day++) {
    const count = counts.get(dateKey(new Date(year, month, day))) ?? 0;
    cells.push(
      count
        ? `${String(day).padStart(2)}·${Math.min(count, 9)}`
        : `${String(day).padStart(2)}  `,
    );
  }
  const rows: string[] = [];
  for (let index = 0; index < cells.length; index += 7)
    rows.push(cells.slice(index, index + 7).join(" "));
  const total = Array.from(
    { length: days },
    (_, index) => counts.get(dateKey(new Date(year, month, index + 1))) ?? 0,
  ).reduce((sum, value) => sum + value, 0);
  return `### ${monthNames[month]} · ${total}\n\n\`\`\`text\nSu   Mo   Tu   We   Th   Fr   Sa\n${rows.join("\n")}\n\`\`\``;
}

export default function StatsCommand() {
  const currentYear = Math.max(MIN_YEAR, new Date().getFullYear());
  const [year, setYear] = useState(currentYear);
  const [completions, setCompletions] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadCompletions().then((values) => {
      setCompletions(values);
      setIsLoading(false);
    });
  }, []);

  const markdown = useMemo(() => {
    const now = Date.now();
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
    const since = (days: number) =>
      completions.filter((value) => value >= now - days * 86_400_000).length;
    const thisYear = completions.filter((value) => value >= startOfYear).length;
    const counts = new Map<string, number>();
    for (const value of completions) {
      const date = new Date(value);
      if (date.getFullYear() !== year) continue;
      const key = dateKey(date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const overview = [
      `# Focus Statistics`,
      ``,
      `## ${since(7)} · ${since(30)} · ${since(183)} · ${thisYear}`,
      `**Past 7 days** · **Past 30 days** · **Past 6 months** · **This year**`,
      ``,
      `# ${year}`,
      `Days marked \`17·3\` mean three completed Pomodoros on the 17th.`,
      ``,
    ];
    return [
      ...overview,
      ...monthNames.map((_, month) => monthCalendar(year, month, counts)),
    ].join("\n\n");
  }, [completions, year]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Pomodoro Statistics · ${year}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Previous Year"
            icon={Icon.ArrowLeft}
            onAction={() => setYear((value) => Math.max(MIN_YEAR, value - 1))}
            shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          />
          <Action
            title="Next Year"
            icon={Icon.ArrowRight}
            onAction={() => setYear((value) => value + 1)}
            shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          />
          <Action
            title="Jump to This Year"
            icon={Icon.Calendar}
            onAction={() => setYear(currentYear)}
          />
        </ActionPanel>
      }
    />
  );
}
