import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import { List, Cache } from "@raycast/api";
import { useState, useEffect } from "react";
import * as chrono from "chrono-node";
import { DailyNotes } from "./components/DailyNotes";
import { CACHE_KEYS } from "./constants";

const cache = new Cache();

function SpaceDropdown({
  value,
  spaces,
  onSpaceChange,
}: {
  value: string;
  spaces: Array<{ id: string; title: string }>;
  onSpaceChange: (newValue: string) => void;
}) {
  return (
    <List.Dropdown
      value={value}
      tooltip="Select Space"
      onChange={(newValue) => {
        onSpaceChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Spaces">
        {spaces.map((space) => (
          <List.Dropdown.Item key={space.id} title={space.title} value={space.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

// noinspection JSUnusedGlobalSymbols
export default function dailyNotes() {
  const appExists = useAppExists();
  const { config, configLoading } = useConfig(appExists);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState<Date>();
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(cache.get(CACHE_KEYS.DAILY_NOTES_SPACE_ID) || "");

  const handleSpaceChange = (newValue: string) => {
    setSelectedSpaceId(newValue);
    cache.set(CACHE_KEYS.DAILY_NOTES_SPACE_ID, newValue);
  };

  // Set default space when config loads
  useEffect(() => {
    if (config && config.primarySpace() && !selectedSpaceId) {
      const primarySpaceId = config.primarySpace()?.spaceID || "";
      setSelectedSpaceId(primarySpaceId);
      cache.set(CACHE_KEYS.DAILY_NOTES_SPACE_ID, primarySpaceId);
    }
  }, [config, selectedSpaceId]);

  // Reset to primary space if selected space no longer exists
  useEffect(() => {
    if (selectedSpaceId && config && !config.getEnabledSpaces().find((s) => s.spaceID === selectedSpaceId)) {
      const primarySpaceId = config.primarySpace()?.spaceID || "";
      handleSpaceChange(primarySpaceId);
    }
  }, [selectedSpaceId, config]);

  const parseDate = (text: string) => {
    setQuery(text);

    const date = chrono.parseDate(text);
    if (!date) {
      setDate(undefined);
      return;
    }

    setDate(date);
  };

  const spaces = config?.getAllSpacesForDropdown() || [];
  const showSpaceDropdown = spaces.length > 1;

  return (
    <List
      isLoading={configLoading}
      onSearchTextChange={parseDate}
      searchBarAccessory={
        showSpaceDropdown ? (
          <SpaceDropdown spaces={spaces} onSpaceChange={handleSpaceChange} value={selectedSpaceId} />
        ) : null
      }
    >
      <DailyNotes
        appExists={appExists.appExists}
        config={config}
        date={date}
        query={query}
        selectedSpaceId={selectedSpaceId}
      />
    </List>
  );
}
