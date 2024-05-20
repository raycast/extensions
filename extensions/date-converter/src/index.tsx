import { Clipboard, ActionPanel, List, Action, getPreferenceValues } from "@raycast/api";
import * as chrono from "chrono-node";
import { useMemo, useState } from "react";
import "@total-typescript/ts-reset";

interface LabeledDate {
  label?: string;
  human: boolean;
  date: Date;
}

interface DateFormatter {
  id: string;
  title: string;
  human: boolean;
  format: (date: Date) => string;
}

interface Preferences {
  defaultFormat: string;
  copyAction: "copy" | "paste" | "both";
}

const humanFormatter = new Intl.DateTimeFormat([], {
  dateStyle: "full",
  timeStyle: "short",
});

const DATE_FORMATS: DateFormatter[] = [
  {
    id: "human",
    title: "Human Date",
    human: true,
    format: (date) => humanFormatter.format(date),
  },
  {
    id: "unix-ms",
    title: "Unix Timestamp (ms)",
    human: false,
    format: (date) => date.getTime().toString(),
  },
  {
    id: "unix-s",
    title: "Unix Timestamp (seconds)",
    human: false,
    format: (date) => Math.floor(date.getTime() / 1000).toString(),
  },
  {
    id: "iso",
    title: "ISO Date",
    human: false,
    format: (date) => date.toISOString(),
  },
];

function parseMachineReadableDate(query: string): LabeledDate | undefined {
  const parsedDate = new Date(query);
  const isIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(query);
  if (!isNaN(parsedDate.getTime()) && isIso) {
    return {
      date: parsedDate,
      label: "ISO Date",
      human: false,
    };
  }
  const isNanoSecondTimestamp = /^\d{19}$/.test(query);
  if (isNanoSecondTimestamp) {
    return {
      date: new Date(Number(BigInt(query) / 1_000_000n)),
      label: "Unix Timestamp (ns)",
      human: false,
    };
  }
  const isMicroSecondTimestamp = /^\d{16}$/.test(query);
  if (isMicroSecondTimestamp) {
    return {
      date: new Date(Number(BigInt(query) / 1_000n)),
      label: "Unix Timestamp (μs)",
      human: false,
    };
  }

  let timestamp = parseInt(query, 10);

  if (!isNaN(timestamp) && timestamp > 1000000) {
    let seconds = false;
    if (timestamp <= 2 ** 31) {
      seconds = true;
      timestamp *= 1000;
    }
    const date = new Date(timestamp || query);
    if (!isNaN(date.getTime())) {
      return {
        date,
        label: seconds ? "Unix Timestamp (seconds)" : "Unix Timestamp (ms)",
        human: false,
      };
    }
  }
}

function getResults(query: string): LabeledDate[] {
  if (!query) {
    return [
      {
        label: "Now",
        date: new Date(),
      },
      {
        label: "Today",
        date: new Date().setHours(0, 0, 0, 0),
      },
      {
        label: "Tomorrow",
        date: new Date().setHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000,
      },
      {
        label: "Yesterday",
        date: new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000,
      },
    ].map((x) => ({
      label: x.label,
      human: true,
      date: new Date(x.date),
    }));
  }

  const machine = parseMachineReadableDate(query);
  const human = chrono.parse(query).map((x) => ({ date: x.date(), human: true, label: x.text }));

  return [machine, ...human].filter(Boolean).filter((x, i, arr) => {
    const date = x.date.toISOString();
    return arr.findIndex((y) => y.date.toISOString() === date) === i;
  });
}

function copy(text: string) {
  const { copyAction } = getPreferenceValues<Preferences>();

  if (["copy", "both"].includes(copyAction)) {
    Clipboard.copy(text);
  }
  if (["paste", "both"].includes(copyAction)) {
    Clipboard.paste(text);
  }
}

function getSortedFormats({ human }: Pick<LabeledDate, "human">): DateFormatter[] {
  const { defaultFormat } = getPreferenceValues<Preferences>();

  return DATE_FORMATS.sort((a, b) => {
    const aMatchesType = a.human === human;
    const bMatchesType = b.human === human;

    // Sort the opposite type first
    if (aMatchesType && !bMatchesType) return 1;
    if (!aMatchesType && bMatchesType) return -1;

    const aIsPreferred = a.id === defaultFormat;
    const bIsPreferred = b.id === defaultFormat;

    // Sort the preferred format first
    if (aIsPreferred && !bIsPreferred) return -1;
    if (!aIsPreferred && bIsPreferred) return 1;

    return 0;
  });
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const results = useMemo(() => getResults(searchText), [searchText]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a human or machine readable date"
    >
      <List.EmptyView title="Invalid Date" description="Failed to parse your date in a human or machine format." />
      {results.map(({ date, label, human }) => (
        <List.Item
          key={date.toISOString()}
          title={humanFormatter.format(date)}
          subtitle={label}
          actions={
            <ActionPanel>
              {getSortedFormats({ human }).map(({ id, title, format }) => (
                <Action key={id} title={`Copy as ${title}`} onAction={() => copy(format(date))} />
              ))}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
