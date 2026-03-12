import { List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

function toTime(decimal: number): string {
  const totalSeconds = Math.round(decimal * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function toDecimal(time: string): number {
  const parts = time.split(":");
  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  const seconds = parseInt(parts[2] || "0", 10);
  return hours + minutes / 60 + seconds / 3600;
}

export default function Command() {
  const [query, setQuery] = useState("");

  const items: { title: string; subtitle: string; value: string }[] = [];

  const trimmed = query.trim();
  if (trimmed) {
    const hasDecimal = trimmed.includes(".");
    const hasColon = trimmed.includes(":");

    if (hasColon) {
      const decimal = toDecimal(trimmed);
      if (!isNaN(decimal)) {
        const formatted = parseFloat(decimal.toFixed(6)).toString();
        items.push({
          title: formatted,
          subtitle: "Decimal Conversion",
          value: formatted,
        });
      }
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        const time = toTime(num);
        items.push({ title: time, subtitle: "Time Conversion", value: time });

        if (!hasDecimal) {
          const decimal = toDecimal(trimmed + ":00");
          const formatted = parseFloat(decimal.toFixed(6)).toString();
          items.push({
            title: formatted,
            subtitle: "Decimal Conversion",
            value: formatted,
          });
        }
      }
    }
  }

  return (
    <List
      searchBarPlaceholder="Enter decimal (3.4322) or time (03:25:56)"
      onSearchTextChange={setQuery}
      throttle
    >
      {items.length > 0 ? (
        items.map((item) => (
          <List.Item
            key={item.subtitle}
            title={item.title}
            subtitle={item.subtitle}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item.value} />
                <Action.Paste content={item.value} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="Decimal 2 Time"
          description="Enter a decimal value (e.g., 3.4322) or time (e.g., 03:25:56)"
        />
      )}
    </List>
  );
}
