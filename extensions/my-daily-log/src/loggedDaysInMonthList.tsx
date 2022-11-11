import { List } from "@raycast/api";
import { useState } from "react";
import { getDailyLog } from "./domain/getDailyLog";
import { getLoggedDays } from "./domain/getLoggedDays";
import { LoggedDay } from "./domain/LoggedDay";
import { capitalize } from "./shared/capitalize";

export default function Command() {
  const d = getLoggedDays();
  const [items] = useState<LoggedDay[]>(d);
  return (
    <List isShowingDetail>
      {items.map((item) => (
        <List.Item key={item.date.toISOString()} title={item.title} detail={<Detail date={item.date} />} />
      ))}
    </List>
  );
}

function Detail(props: { date: Date }) {
  const items = getDailyLog(props.date);
  return (
    <List.Item.Detail
      markdown={items.map((item) => `* ${capitalize(item.title)} - _${hoursAndMinutes(item.date)}_`).join("\n")}
    />
  );
}

function hoursAndMinutes(date: Date): string {
  // in the format of 24:34 in itallics
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}
