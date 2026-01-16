import { List, Icon, showFailureToast } from "@raycast/api";
import fs from "fs";
import path from "path";

type Holiday = {
  date: string;
  name: string;
  flexi: boolean;
};

const HOLIDAYS_PATH = path.join(
  process.env.HOME || "",
  ".raycast_extensions",
  "holidays.json"
);

function formatDayDate(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const day = date.toLocaleDateString("en-US", { day: "2-digit" });
  return `${weekday} ${day}`;
}

function monthKey(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function Command() {
  let holidays: Holiday[];

  try {
    const raw = fs.readFileSync(HOLIDAYS_PATH, "utf-8");
    holidays = JSON.parse(raw);
  } catch {
    showFailureToast(
      "holidays.json not found",
      `Create ${HOLIDAYS_PATH}`
    );
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = holidays
    .map(h => ({ ...h, dateObj: new Date(h.date) }))
    .filter(h => h.dateObj >= today)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const grouped = upcoming.reduce<Record<string, typeof upcoming>>(
    (acc, h) => {
      const key = monthKey(h.dateObj);
      acc[key] ||= [];
      acc[key].push(h);
      return acc;
    },
    {}
  );

  return (
    <List>
      {Object.entries(grouped).map(([month, items]) => (
        <List.Section key={month} title={month}>
          {items.map(h => (
            <List.Item
              key={h.date}
              title={`${formatDayDate(h.dateObj)}  ${h.name}`}
              icon={{
                source: h.flexi ? Icon.QuestionMarkCircle : Icon.Star,
                tintColor: h.flexi ? "#3B82F6" : "#F59E0B",
              }}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
