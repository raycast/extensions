import { Clipboard, ActionPanel, List, Action, getPreferenceValues } from "@raycast/api";
import * as chrono from "chrono-node";
import { useMemo, useState } from "react";
import TimeAgo from "javascript-time-ago";
import NepaliDate from "nepali-datetime";
import en from "javascript-time-ago/locale/en";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

interface LabeledDate {
  label?: string;
  human: boolean;
  date: Date;
  isNepali?: boolean;
  nepaliDate?: NepaliDate;
  isConverted?: boolean;
}

interface DateFormatter {
  id: string;
  title: string;
  human: boolean;
  format: (date: Date, nepaliDate?: NepaliDate) => string;
}

interface Preferences {
  defaultFormat: string;
  copyAction: "copy" | "paste" | "both";
  hour24: boolean;
}

const humanFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
});

const DATE_FORMATS: DateFormatter[] = [
  {
    id: "human",
    title: "Human Date",
    human: true,
    format: (date, nepaliDate) => {
      const enFormatted = humanFormatter.format(date);
      const npFormatted = nepaliDate ? nepaliDate.formatNepali("YYYY MMMM DD dddd") : "";
      return nepaliDate ? `${npFormatted}` : enFormatted;
    },
  },
  {
    id: "nepali",
    title: "Nepali Date 🇳🇵",
    human: true,
    format: (date, nepaliDate) => {
      try {
        const nd = nepaliDate || new NepaliDate(date);
        return nd.formatNepali("YYYY MMMM DD dddd");
      } catch (error) {
        return "Invalid Nepali Date";
      }
    },
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
    format: (date) => date.toISOString().split("T")[0],
  },
];

function parseMachineReadableDate(query: string, now: Date): LabeledDate | undefined {
  const parsedDate = new Date(query);
  if (!isNaN(parsedDate.getTime())) {
    parsedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return {
      date: parsedDate,
      label: "AD",
      human: true,
      isNepali: false,
    };
  }
}

function parseNepaliDate(query: string, now: Date): LabeledDate | undefined {
  try {
    const nepaliDate = new NepaliDate(query);
    const date = nepaliDate.getDateObject();
    date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return {
      date,
      label: "BS",
      human: true,
      isNepali: true,
      nepaliDate,
    };
  } catch (error) {
    return undefined;
  }
}

function parseNaturalLanguageDate(query: string, now: Date): LabeledDate[] {
  const chronoParsed = chrono.parse(query);
  const results: LabeledDate[] = chronoParsed.map((parsed) => {
    const date = parsed.date();
    date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return {
      date,
      label: "AD",
      human: true,
      isNepali: false,
    };
  });
  return results;
}

function getResults(query: string): LabeledDate[] {
  const now = new Date();

  if (!query) {
    try {
      const nepaliNow = new NepaliDate(now);
      return [
        {
          label: "BS",
          date: now,
          human: true,
          isNepali: true,
          nepaliDate: nepaliNow,
          isConverted: false,
        },
        {
          label: "AD",
          date: now,
          human: true,
          isNepali: false,
          isConverted: false,
        },
      ];
    } catch (error) {
      return [];
    }
  }

  let results: LabeledDate[] = [];

  // Try parsing as Nepali Date
  const nepaliDate = parseNepaliDate(query, now);
  if (nepaliDate) {
    results.push(nepaliDate);
    // Convert BS to AD
    try {
      const adDate = new Date(nepaliDate.nepaliDate?.getDateObject() || nepaliDate.date);
      adDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      results.push({
        date: adDate,
        label: "AD",
        human: true,
        isNepali: false,
        isConverted: true,
      });
    } catch (error) {
      // Handle NepaliDate construction error
    }
  }

  // Try parsing as AD Date
  const machine = parseMachineReadableDate(query, now);
  if (machine) {
    results.push(machine);
    // Convert AD to BS
    try {
      const nepaliDate = new NepaliDate(machine.date);
      results.push({
        date: machine.date,
        label: "BS",
        human: true,
        isNepali: true,
        nepaliDate,
        isConverted: true,
      });
    } catch (error) {
      // Handle NepaliDate construction error
    }
  }

  // Try parsing as Natural Language
  const naturalLanguageDates = parseNaturalLanguageDate(query, now);
  naturalLanguageDates.forEach((date) => {
    results.push(date);
    // Convert AD to BS
    try {
      const nepaliDate = new NepaliDate(date.date);
      results.push({
        date: date.date,
        label: "BS",
        human: true,
        isNepali: true,
        nepaliDate,
        isConverted: true,
      });
    } catch (error) {
      // Handle NepaliDate construction error
    }
  });

  // Remove duplicates based on date string and calendar type
  return results.filter((x, i, arr) => {
    const dateStr = x.date.toISOString();
    return arr.findIndex((y) => y.date.toISOString() === dateStr && y.label === x.label) === i;
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
    // First priority: default format
    if (a.id === defaultFormat) return -1;
    if (b.id === defaultFormat) return 1;

    // Second priority: matching human type
    const aMatchesType = a.human === human;
    const bMatchesType = b.human === human;
    if (aMatchesType && !bMatchesType) return -1;
    if (!aMatchesType && bMatchesType) return 1;

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
      searchBarPlaceholder="Enter a date (AD YYYY-MM-DD or BS YYYY-MM-DD)"
    >
      <List.EmptyView title="Invalid Date" description="Failed to parse your date in AD or BS format." />
      {results.map(({ date, label, human, isNepali, nepaliDate, isConverted }) => {
        let title;
        let subtitle = "";

        if (isNepali) {
          try {
            const nd = nepaliDate || new NepaliDate(date);
            title = nd.formatNepali("YYYY MMMM DD dddd");
            subtitle = `${timeAgo.format(date)} - BS${isConverted ? " (converted)" : ""}`;
          } catch (error) {
            title = "Invalid Nepali Date";
          }
        } else {
          title = humanFormatter.format(date);
          subtitle = `${timeAgo.format(date)} - AD${isConverted ? " (converted)" : ""}`;
        }
        return (
          <List.Item
            key={`${date.toISOString()}-${isNepali ? "nepali" : "english"}`}
            title={title}
            subtitle={subtitle}
            actions={
              <ActionPanel>
                {getSortedFormats({ human }).map(({ id, title: formatTitle, format }) => {
                  //   console.log(formatTitle);
                  return (
                    <Action key={id} title={`Copy as ${formatTitle}`} onAction={() => copy(format(date, nepaliDate))} />
                  );
                })}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
