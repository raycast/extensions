import { LocalStorage, List } from "@raycast/api";
import { useEffect, useState } from "react";
import sportInfo from "./utils/getSportInfo";
import getScoresAndSchedule from "./utils/getSchedule";
import DisplayScoresAndSchedule from "./templates/scores-and-schedule";

const displaySchedule = () => {
  const [currentLeague, displaySelectLeague] = useState("ENG.1");

  useEffect(() => {
    async function loadStoredDropdown() {
      const storedValue = await LocalStorage.getItem("soccerScoresDropdown");

      if (typeof storedValue === "string") {
        displaySelectLeague(storedValue);
      } else {
        displaySelectLeague("ENG.1");
      }
    }

    loadStoredDropdown();
  }, []);

  const { scheduleLoading } = getScoresAndSchedule();
  sportInfo.setSportAndLeague("soccer", `${currentLeague}`);

  return (
    <List
      searchBarPlaceholder="Search for a game or team"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          onChange={async (newValue) => {
            displaySelectLeague(newValue);
            await LocalStorage.setItem("soccerScoresDropdown", newValue);
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
      isLoading={scheduleLoading}
    >
      <DisplayScoresAndSchedule />;
    </List>
  );
};

export default displaySchedule;
