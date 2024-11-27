import { getPreferenceValues, List } from "@raycast/api";
import useSchedule from "../hooks/useSchedule";
import DayComponent from "../components/Day";
import { useState } from "react";

const Schedule = () => {
  const { league, useLastValue } = getPreferenceValues<Preferences>();
  const [selectedLeague, setSelectedLeague] = useState<string>(league); // Default to NBA
  const { data, isLoading } = useSchedule(selectedLeague);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`${selectedLeague.toUpperCase()} Schedule`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select League"
          onChange={setSelectedLeague}
          {...(useLastValue ? { storeValue: true } : { defaultValue: league })}
        >
          <List.Dropdown.Section title="Leagues">
            <List.Dropdown.Item value="nba" title="NBA" />
            <List.Dropdown.Item value="wnba" title="WNBA" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {data?.map((day) => <DayComponent key={day.date} day={day} />)}
    </List>
  );
};

export default Schedule;
