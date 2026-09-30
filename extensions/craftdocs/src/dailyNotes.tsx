import { List } from "@raycast/api";
import * as chrono from "chrono-node";
import { useState } from "react";
import { DailyNotes } from "./components/DailyNotes";
import { CraftEnvironmentList } from "./components/CraftCommandState";
import ListSpaceDropdown from "./components/ListSpaceDropdown";
import { CACHE_KEYS } from "./constants";
import useCraftCommandContext from "./hooks/useCraftCommandContext";
import usePersistedSpaceSelection from "./hooks/usePersistedSpaceSelection";

// noinspection JSUnusedGlobalSymbols
export default function dailyNotes() {
  const command = useCraftCommandContext();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState<Date>();

  const spaces = command.config.config?.spacesForDropdown || [];
  const primarySpaceId = command.config.config?.primarySpace?.spaceID || "";
  const { selectedSpaceId, setSelectedSpaceId } = usePersistedSpaceSelection({
    cacheKey: CACHE_KEYS.DAILY_NOTES_SPACE_ID,
    validSelections: spaces.map((space) => space.id),
    fallbackSelection: primarySpaceId,
  });

  const parseDate = (text: string) => {
    setQuery(text);

    const nextDate = chrono.parseDate(text);
    if (!nextDate) {
      setDate(undefined);
      return;
    }

    setDate(nextDate);
  };

  if (command.loading) {
    return <List isLoading={true} />;
  }

  if (!command.environment.environment || command.environment.environment.status !== "ready") {
    return <CraftEnvironmentList environment={command.environment.environment} />;
  }

  return (
    <List
      isLoading={command.config.configLoading}
      onSearchTextChange={parseDate}
      searchBarPlaceholder="Search for dates..."
      searchBarAccessory={
        spaces.length > 1 ? (
          <ListSpaceDropdown spaces={spaces} onChange={setSelectedSpaceId} value={selectedSpaceId} />
        ) : undefined
      }
    >
      <DailyNotes config={command.config.config} date={date} query={query} selectedSpaceId={selectedSpaceId} />
    </List>
  );
}
