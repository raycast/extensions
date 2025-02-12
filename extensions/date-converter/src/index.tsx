import { Clipboard, ActionPanel, List, Action, getPreferenceValues } from "@raycast/api";
import * as chrono from "chrono-node";
import { useMemo, useState } from "react";
import "@total-typescript/ts-reset";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import dayjs from "dayjs";
import { listTimeZones } from "timezone-support";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_DATE_FORMAT = "dddd, MMMM D, YYYY hh:mm:ss";
const TIMEZONES = listTimeZones();
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

interface LabeledDate {
  label?: string;
  human: boolean;
  date: Date;
}

interface DateFormatter {
  id: string;
  title: string;
  human: boolean;
  format: (date: Date, tz: string) => string;
}

interface Preferences {
  defaultFormat: string;
  copyAction: "copy" | "paste" | "both";
  displayFormat: string;
  humanFormat: string;
}

const displayFormatter = (date: Date, tz: string): string => {
  return dayjs(date)
    .tz(tz)
    .format(getPreferenceValues<Preferences>().displayFormat.trim() || DEFAULT_DATE_FORMAT);
};

const DATE_FORMATS: DateFormatter[] = [
  {
    id: "human",
    title: "Human Date",
    human: true,
    format: (date: Date, tz: string) =>
      dayjs(date)
        .tz(tz)
        .format(getPreferenceValues<Preferences>().humanFormat.trim() || DEFAULT_DATE_FORMAT),
  },
  {
    id: "unix-ms",
    title: "Unix Timestamp (ms)",
    human: false,
    format: (date: Date, tz: string) => dayjs(date).tz(tz).valueOf().toString(),
  },
  {
    id: "unix-s",
    title: "Unix Timestamp (seconds)",
    human: false,
    format: (date: Date, tz: string) => dayjs(date).tz(tz).unix().toString(),
  },
  {
    id: "iso",
    title: "ISO Date",
    human: false,
    format: (date: Date, tz: string) => dayjs(date).tz(tz).toISOString(),
  },
];

function isHex(query: string) {
  return /^0x[0-9a-f]+$/i.test(query);
}

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

  let base = 10;
  if (isHex(query)) {
    base = 16;
  }

  let timestamp = parseInt(query, base);

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

  query = query.trim();

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

function TimezoneDropdown(props: {
  localTimezone: string;
  timezones: string[];
  onTimezoneChange: (value: string) => void;
}) {
  const { localTimezone, timezones, onTimezoneChange } = props;
  return (
    <List.Dropdown tooltip="Select Target Timezone" storeValue={true} onChange={onTimezoneChange}>
      <List.Dropdown.Section title="Timezones">
        <List.Dropdown.Item key={localTimezone} title={`${localTimezone} - local`} value={localTimezone} />
        {timezones.map((tz) => {
          if (tz === localTimezone) {
            return null;
          }
          return <List.Dropdown.Item key={tz} title={tz} value={tz} />;
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [tz, setTz] = useState(LOCAL_TIMEZONE);

  const results = useMemo(() => getResults(searchText), [searchText]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a human or machine readable date"
      searchBarAccessory={
        <TimezoneDropdown localTimezone={LOCAL_TIMEZONE} timezones={TIMEZONES} onTimezoneChange={setTz} />
      }
    >
      <List.EmptyView title="Invalid Date" description="Failed to parse your date in a human or machine format." />
      {results.map(({ date, label, human }) => (
        <List.Item
          key={date.toISOString()}
          title={displayFormatter(date, tz)}
          subtitle={`${label} - ${timeAgo.format(date)}`}
          actions={
            <ActionPanel>
              {getSortedFormats({ human }).map(({ id, title, format }) => (
                <Action key={id} title={`Copy as ${title}`} onAction={() => copy(format(date, tz))} />
              ))}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
