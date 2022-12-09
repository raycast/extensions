import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [text, setText] = useState("");
  const [daysBefore, setDaysBefore] = useState<Date>();
  const [daysAfter, setDaysAfter] = useState<Date>();
  const [within, setWithin] = useState<boolean | null>(null);

  const daysBeforeWith = (value: string, date: Date) => {
    const days = date.getDate() - Number(value);
    return new Date(date.setDate(days));
  };
  const daysAfterWith = (value: string, date: Date) => {
    const days = date.getDate() + Number(value);
    return new Date(date.setDate(days));
  };
  const onSearchTextChange = (value = "") => {
    const [num, base] = value.split(" ");
    const today = new Date();
    const baseDate = base?.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/) ? new Date(base) : today;
    const beforeDate = daysBeforeWith(num, new Date(baseDate.getTime()));
    const afterDate = daysAfterWith(num, new Date(baseDate.getTime()));
    setText(value);
    setDaysBefore(beforeDate);
    setDaysAfter(afterDate);
    setWithin(beforeDate.valueOf() <= today.valueOf() && today.valueOf() <= afterDate.valueOf());
  };
  return (
    <List
      enableFiltering={false}
      searchText={text}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Example: 20 2023-01-01"
    >
      <List.Item
        title={daysBefore?.toDateString() || ""}
        accessories={[{ text: "Before" }]}
        subtitle={daysBefore?.toString() || ""}
        actions={
          <ActionPanel title="Copy">
            <Action.CopyToClipboard title="Copy to clipboard" content={daysBefore?.toString() || ""} />
          </ActionPanel>
        }
      />
      <List.Item
        title={daysAfter?.toDateString() || ""}
        accessories={[{ text: "After" }]}
        subtitle={daysAfter?.toString() || ""}
        actions={
          <ActionPanel title="Copy">
            <Action.CopyToClipboard title="Copy to clipboard" content={daysAfter?.toString() || ""} />
          </ActionPanel>
        }
      />
      <List.Item title={within === null ? "" : within ? "Yes" : "No"} accessories={[{ text: "Today in the range?" }]} />
    </List>
  );
}
