import { List } from "@raycast/api";
import DayComponent from "../components/Day";
import { useLeague } from "../contexts/leagueContext";
import { useShowDetails } from "../contexts/showDetailsContext";
import useScores from "../hooks/useScores";

const Scores = () => {
  const { value: league, setValue: setLeague, useLastValue } = useLeague();
  const { data, isLoading } = useScores(league);

  const { value: showDetails } = useShowDetails();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetails}
      searchBarPlaceholder={`${league.toUpperCase()} Scores`}
      searchBarAccessory={
        <List.Dropdown tooltip="Select League" storeValue={useLastValue} onChange={setLeague}>
          <List.Dropdown.Section title="Leagues">
            <List.Dropdown.Item value="nba" title="NBA" />
            <List.Dropdown.Item value="wnba" title="WNBA" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {data && data.length > 0
        ? data.map((day) => <DayComponent key={day.date} day={day} />)
        : !isLoading && (
            <List.EmptyView
              title="No Scores Available"
              description="There are no games scheduled or scores available at the moment."
            />
          )}
    </List>
  );
};

export default Scores;
