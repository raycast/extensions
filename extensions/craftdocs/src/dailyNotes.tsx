import useAppExists from "./hooks/useAppExists";
import { List } from "@raycast/api";
import { useState } from "react";
import * as chrono from "chrono-node";
import { DailyNotes } from "./components/DailyNotes";
import useNamedSpaces from "./hooks/useNamedSpaces";
import useConfig from "./hooks/useConfig";
import useSelectedSpaceID from "./hooks/useSelectedSpaceID";
import { Spaces } from "./types";
import { tee } from "./functions/logs";
import Config from "./Config";

// noinspection JSUnusedGlobalSymbols
export default function dailyNotes() {
  const { appExists, appExistsLoading } = useAppExists();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState<Date>();

  const { config, configLoading } = useConfig({ appExists, appExistsLoading });
  const { namedSpacesLoading, namedSpaces } = useNamedSpaces();
  const { selectedSpaceIDLoading, selectedSpaceID, saveSelectedSpaceID } = useSelectedSpaceID();

  const parseDate = (text: string) => {
    setQuery(tee("date query", text));
    setDate(tee("parsed date query", chrono.parseDate(text) || undefined));
  };

  return (
    <List
      isLoading={appExistsLoading || configLoading || namedSpacesLoading || selectedSpaceIDLoading}
      onSearchTextChange={parseDate}
      searchBarAccessory={searchBarAccessory({
        namedSpaces,
        saveSelectedSpaceID,
        selectedSpaceID,
        selectedSpaceIDLoading,
        config,
      })}
    >
      <DailyNotes appExists={appExists} config={config} date={date} query={query} spaceID={selectedSpaceID} />
    </List>
  );
}

type SearchBarAccessoryProps = {
  namedSpaces: Spaces;
  saveSelectedSpaceID: (value: string) => void;
  selectedSpaceID: string | undefined;
  selectedSpaceIDLoading: boolean;
  config: Config | undefined;
};

const searchBarAccessory = ({
  selectedSpaceID,
  saveSelectedSpaceID,
  namedSpaces,
  selectedSpaceIDLoading,
  config,
}: SearchBarAccessoryProps) => {
  if (selectedSpaceIDLoading) return undefined;
  if (namedSpaces.length === 0) return undefined;
  if (!config) return undefined;

  return (
    <List.Dropdown
      onChange={saveSelectedSpaceID}
      tooltip="Space within which perform the lookup"
      defaultValue={selectedSpaceID}
    >
      {config.spaces
        .map((sqliteSpace) => namedSpaces.find((namedSpace) => namedSpace.id === sqliteSpace.spaceID))
        .filter((namedSpace) => namedSpace)
        .map((space) => space && <List.Dropdown.Item key={space.id} title={space.name} value={space.id} />)}
    </List.Dropdown>
  );
};
