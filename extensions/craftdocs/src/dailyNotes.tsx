import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import * as chrono from "chrono-node";

// noinspection JSUnusedGlobalSymbols
export default function dailyNotes() {
  const { appExists, appExistsLoading } = useAppExists();
  const { config, configLoading } = useConfig({ appExists, appExistsLoading });
  const [query, setQuery] = useState("");
  const [date, setDate] = useState<Date>();

  const parseDate = (text: string) => {
    setQuery(text);

    const date = chrono.parseDate(text);
    if (!date) {
      setDate(undefined);
      return;
    }

    setDate(date);
  };

  return (
    <List isLoading={appExistsLoading && configLoading} onSearchTextChange={parseDate}>
      {query.length === 0 && (
        <List.Section title="Shortcuts">
          <Shortcut dayRef="today" spaceID={config?.primarySpace()?.spaceID || ""} />
          <Shortcut dayRef="yesterday" spaceID={config?.primarySpace()?.spaceID || ""} />
          <Shortcut dayRef="tomorrow" spaceID={config?.primarySpace()?.spaceID || ""} />
        </List.Section>
      )}
      {query.length > 0 && <DailyNoteRef date={date} text={query} spaceID={config?.primarySpace()?.spaceID || ""} />}
    </List>
  );
}

const DailyNoteRef = ({ date, text, spaceID }: { date: Date | undefined; text: string; spaceID: string }) => (
  <List.Item
    title={date ? date.toDateString() : "Specify query"}
    subtitle={text}
    actions={
      !date ? undefined : (
        <ActionPanel>
          <Action.Open
            title={`Open ${date.toDateString()}`}
            target={`craftdocs://openByQuery?query=${date.toISOString().substring(0, 10)}&spaceId=${spaceID}`}
          />
        </ActionPanel>
      )
    }
  />
);

type DayReference = "today" | "yesterday" | "tomorrow";

const Shortcut = ({ dayRef, spaceID }: { dayRef: DayReference; spaceID: string }) => (
  <List.Item
    title={toTitleCase(dayRef)}
    subtitle={chrono.parseDate(dayRef).toDateString()}
    actions={
      <ActionPanel>
        <Action.Open
          title={`Open ${dayRef} notes`}
          target={`craftdocs://openByQuery?query=${dayRef}&spaceId=${spaceID}`}
        />
      </ActionPanel>
    }
  />
);

const toTitleCase = (str: string) => str.substring(0, 1).toUpperCase() + str.substring(1);
