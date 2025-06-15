import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import { List } from "@raycast/api";
import { useState } from "react";
import * as chrono from "chrono-node";
import { DailyNotes } from "./components/DailyNotes";

// noinspection JSUnusedGlobalSymbols
export default function dailyNotes() {
  const appExists = useAppExists();
  const { config, configLoading } = useConfig(appExists);
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
    <List isLoading={configLoading} onSearchTextChange={parseDate}>
      <DailyNotes appExists={appExists.appExists} config={config} date={date} query={query} />
    </List>
  );
}
