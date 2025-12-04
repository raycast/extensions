import { LocalStorage, List } from "@raycast/api";
import { useEffect, useState } from "react";
import sportInfo from "./utils/getSportInfo";
import getTeamStandings from "./utils/getStandings";
import DisplayTeamStandings from "./templates/standings";

const displaySchedule = () => {
  const [currentLeague, displaySelectLeague] = useState("ENG.1");

  useEffect(() => {
    async function loadStoredDropdown() {
      const storedValue = await LocalStorage.getItem("soccerStandingsDropdown");

      if (typeof storedValue === "string") {
        displaySelectLeague(storedValue);
      } else {
        displaySelectLeague("ENG.1");
      }
    }

    loadStoredDropdown();
  }, []);

  const { standingsLoading } = getTeamStandings();
  sportInfo.setSportAndLeague("soccer", `${currentLeague}`);

  return (
    <List
      searchBarPlaceholder="Search for a team"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          onChange={async (newValue) => {
            displaySelectLeague(newValue);
            await LocalStorage.setItem("soccerStandingsDropdown", newValue);
          }}
          value={currentLeague}
          defaultValue="ENG.1"
        >
          <List.Dropdown.Item title="EPL" value="ENG.1" />
          <List.Dropdown.Item title="UEFA" value="uefa.champions" />
          <List.Dropdown.Item title="SLL" value="ESP.1" />
          <List.Dropdown.Item title="GER" value="GER.1" />
          <List.Dropdown.Item title="ITA" value="ITA.1" />
        </List.Dropdown>
      }
      isLoading={standingsLoading}
    >
      <DisplayTeamStandings />;
    </List>
  );
};

export default displaySchedule;
