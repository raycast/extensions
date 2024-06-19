import { ActionPanel, Action, List } from "@raycast/api";
import { useMemo, useState } from "react";
import * as chrono from "chrono-node";
import dayjs from "dayjs";

interface Option {
  displayText: string;
  timestamp: string;
}

export default function Command() {
  const [input, setInput] = useState("");

  const options: Option[] = useMemo(() => {
    if (input.length === 0) {
      return [];
    }

    const result = chrono.parseDate(input);
    if (result == null) {
      return [];
    }

    const dayjsDate = dayjs(result);
    const timestamp = dayjsDate.unix();

    return [
      {
        displayText: dayjsDate.format("MMMM DD, YYYY [at] hh:mm A"),
        timestamp: `<t:${timestamp}:f>`,
      },
      {
        displayText: dayjsDate.format("hh:mm A"),
        timestamp: `<t:${timestamp}:t>`,
      },
      {
        displayText: dayjsDate.format("dddd, MMMM DD, YYYY [at] hh:mm A"),
        timestamp: `<t:${timestamp}:F>`,
      },
    ];
  }, [input]);

  return (
    <List onSearchTextChange={setInput} searchBarPlaceholder="Enter a date and/or time">
      {options.map((option) => (
        <ListItem key={option.displayText} option={option} />
      ))}
    </List>
  );
}

function ListItem({ option }: { option: Option }) {
  return (
    <List.Item
      title={option.displayText}
      accessories={[{ text: option.timestamp }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy timestamp" content={option.timestamp} />
          <Action.CopyToClipboard title="Copy time display text" content={option.displayText} />
        </ActionPanel>
      }
    />
  );
}
