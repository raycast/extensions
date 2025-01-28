import { List } from "@raycast/api";
import { useLeague } from "../contexts/leagueContext";
import { useShowDetails } from "../contexts/showDetailsContext";
import useSchedule from "../hooks/useSchedule";
import DayComponent from "../components/Day";

const Schedule = () => {
  const { value: league, setValue: setLeague, useLastValue } = useLeague();
  const { value: showDetails } = useShowDetails();

  const { data, isLoading } = useSchedule(league);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetails}
      searchBarPlaceholder={`${league.toUpperCase()} Schedule`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select League"
          onChange={setLeague}
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
