import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import { List } from "@raycast/api";
import { useState } from "react";
import * as chrono from "chrono-node";
import { Shortcut } from "./components/Shortcut";
import { DailyNoteRef } from "./components/DailyNoteRef";

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
