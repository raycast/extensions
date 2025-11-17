import { LocalStorage, List } from "@raycast/api";
import { useEffect, useState } from "react";
import sportInfo from "./utils/getSportInfo";
import getScoresAndSchedule from "./utils/getSchedule";
import DisplayScoresAndSchedule from "./templates/scores-and-schedule";

const displaySchedule = () => {
  const [currentLeague, displaySelectLeague] = useState("nba");

  useEffect(() => {
    async function loadStoredDropdown() {
      const storedValue = await LocalStorage.getItem("basketballScoresDropdown");

      if (typeof storedValue === "string") {
        displaySelectLeague(storedValue);
      } else {
        displaySelectLeague("nba");
      }
    }

    loadStoredDropdown();
  }, []);

  const { scheduleLoading } = getScoresAndSchedule();
  sportInfo.setSportAndLeague("basketball", `${currentLeague}`);

  return (
    <List
      searchBarPlaceholder="Search for a game or team"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          onChange={async (newValue) => {
            displaySelectLeague(newValue);
            await LocalStorage.setItem("basketballScoresDropdown", newValue);
          }}
          value={currentLeague}
          defaultValue="nba"
        >
          <List.Dropdown.Item title="NBA" value="nba" />
          <List.Dropdown.Item title="WNBA" value="wnba" />
          <List.Dropdown.Item title="NCAA M" value="mens-college-basketball" />
          <List.Dropdown.Item title="NCAA W" value="womens-college-basketball" />
        </List.Dropdown>
      }
      isLoading={scheduleLoading}
    >
      <DisplayScoresAndSchedule />
    </List>
  );
};

export default displaySchedule;
