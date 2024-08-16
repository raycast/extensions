import { List } from "@raycast/api";
import useSchedule from "../hooks/useSchedule";
import DayComponent from "../components/Day";
import { useState } from "react";

const Schedule = () => {
  const [selectedLeague, setSelectedLeague] = useState<string>("nba"); // Default to NBA
  const { data, isLoading, setSelectedLeague: updateLeague } = useSchedule(selectedLeague);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`${selectedLeague.toUpperCase()} Schedule`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select League"
          onChange={(newValue) => {
            setSelectedLeague(newValue);
            updateLeague(newValue);
          }}
          value={selectedLeague}
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
