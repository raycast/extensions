import { List } from "@raycast/api";
import { useState } from "react";
import { capitalize } from "./shared/capitalize";
import { DailyLog } from "./domain/DailyLog";
import { formatArgumentDate } from "./shared/formatArgumentDate";
import { formatDateToReadable } from "./shared/formatDateToReadable";
import { getDailyLog } from "./domain/getDailyLog";

interface DailyLogListArguments {
  date: string;
}

export default function Command(props: { arguments: DailyLogListArguments }) {
  const dateInArguments = formatArgumentDate(props.arguments.date);
  const [date] = useState<Date>(dateInArguments);
  const [items] = useState<DailyLog[]>(getDailyLog(date));

  return (
    <List navigationTitle={formatDateToReadable(date)}>
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
