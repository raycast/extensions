import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { capitalize } from "./capitalize";
import { DailyLog } from "./DailyLog";
import { getDailyLog } from "./getDailyLog";

interface DailyLogListArguments {
  date: string;
}

export default function Command(props: { arguments: DailyLogListArguments }) {
  const dateInArguments = formatArgumentDate(props.arguments.date)
  const [items, setItems] = useState<DailyLog[]>([]);
  const [date] = useState<Date>(dateInArguments)

  useEffect(() => {
    const items = getDailyLog(date);
    setItems(items);
  }, []);
  return (
    <List navigationTitle={navigationTitle(date)}>
      {items.map((item) => (
        <List.Item
          key={item.date.toISOString()}
          title={capitalize(item.title)}
          subtitle={item.date.toLocaleTimeString()}
        />
      ))}
    </List>
  );
}

function formatArgumentDate(date: string): Date {
  if (!date) {
    return new Date();
  }
  if (date.toLowerCase() === "today" || date.toLowerCase() === "t") {
    return new Date();
  }
  if (date.toLowerCase() === "yesterday" || date.toLowerCase() === "y") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(date);
  }
  showToast(Toast.Style.Failure, "Invalid date", "Please use the format YYYY-MM-DD");
  return new Date();
}
function navigationTitle(date: Date): string {
  if (date.getDate() === new Date().getDate()) {
    return "Today";
  }
  if (date.getDate() === new Date().getDate() - 1) {
    return "Yesterday";
  }
  return date.toLocaleDateString();
}

