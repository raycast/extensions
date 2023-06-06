import { Action, ActionPanel, Clipboard, List } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  format,
  fromUnixTime,
  getUnixTime,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { parseDate } from "chrono-node";

interface Timestamp {
  label: string;
  value: Date;
}

interface TimestampCollection {
  [key: string]: Timestamp[];
}

function verbose(timestamp: number) {
  return format(fromUnixTime(timestamp), "yyyy-MM-dd h:mm:ssaaa O");
}

function buildSections(searchText: string, clipboard: Date | null): TimestampCollection {
  const now = new Date();

  const sections: TimestampCollection = {
    Input: [],
    Today: [
      { label: "Now", value: now },
      { label: "Start of Today", value: startOfDay(now) },
      { label: "End of Today", value: endOfDay(now) },
    ],
    Past: [
      { label: "Yesterday", value: addDays(now, -1) },
      { label: "Start of Week", value: startOfWeek(now) },
      { label: "Start of Month", value: startOfMonth(now) },
      { label: "Start of Year", value: startOfYear(now) },
    ],
    Future: [
      { label: "Tomorrow", value: addDays(now, 1) },
      { label: "Next Week", value: addWeeks(now, 1) },
      { label: "Next Month", value: addMonths(now, 1) },
      { label: "Next Year", value: addYears(now, 1) },
    ],
  };

  if ("" !== searchText) {
    const parsed = parseDate(searchText);
    if (null !== parsed) {
      sections["Input"].push({ label: `“${searchText}”`, value: parsed });
    }
  }

  if (null !== clipboard) {
    sections["Input"].push({ label: "From Your Clipboard", value: clipboard });
  }

  return sections;
}

export default function PhpTimestampHelper() {
  const [searchText, setSearchText] = useState("");
  const [clipboard, setClipboard] = useState<Date | null>(null);
  const sections = buildSections(searchText, clipboard);

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text && text.match(/^\s*\d{10}\s*$/)) {
        setClipboard(fromUnixTime(parseInt(text.trim())));
      }
    });
  }, []);

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter any date…"
    >
      {Object.entries(sections).map(([label, timestamps]) => {
        return <Section key={label} label={label} timestamps={timestamps} />;
      })}
    </List>
  );
}

function Section(props: { label: string; timestamps: Timestamp[] }) {
  const { label, timestamps } = props;

  if (!timestamps.length) {
    return null;
  }

  return (
    <List.Section title={label}>
      {timestamps.map(({ label, value }) => (
        <Row key={label} label={label} value={value} />
      ))}
    </List.Section>
  );
}

function Row(props: { label: string; value: Date }) {
  const { label, value } = props;

  return (
    <List.Item
      title={`${getUnixTime(value)}`}
      subtitle={label}
      accessories={[{ text: format(value, "yyyy-MM-dd  h:mm:ssaaa  O") }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={`${getUnixTime(value)}`} />
        </ActionPanel>
      }
    />
  );
}
