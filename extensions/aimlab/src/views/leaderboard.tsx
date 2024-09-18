import { List, Icon, Color } from "@raycast/api";
import { useState } from "react";
import useSeasons from "../hooks/useSeasons";
import SeasonComponent from "../components/Season";

const Leaderboard = () => {
  const [seasonStatus, setSeasonStatus] = useState<boolean>(false);
  const { data, isLoading } = useSeasons(seasonStatus);

  return (
    <List
      searchBarPlaceholder="Filter on Season, Tasks,"
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Season Status"
          storeValue
          onChange={(newValue) => {
            setSeasonStatus(newValue === "true");
          }}
        >
          <List.Dropdown.Section title="Season Status">
            <List.Dropdown.Item
              title="All Seasons"
              value="false"
              icon={{ source: Icon.AppWindowList, tintColor: Color.Blue }}
            />
            <List.Dropdown.Item
              title="Active Seasons only"
              value="true"
              icon={{ source: Icon.AppWindow, tintColor: Color.Green }}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading &&
        data?.map((season) => {
          return <SeasonComponent key={season.id} season={season} />;
        })}
    </List>
  );
};

export default Leaderboard;
