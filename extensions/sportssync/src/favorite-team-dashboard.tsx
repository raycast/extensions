import { List, LocalStorage } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import CompletedGames from "./views/favoriteTeamCompleted";
import ScheduledGames from "./views/favoriteTeamScheduled";
import TeamInjuries from "./views/favoriteTeamTracker";
import { getPreferenceValues } from "@raycast/api";

interface preferences {
  name: string;
  id?: string;
}
const preferences = getPreferenceValues<Preferences>();

const favoriteTeam = preferences.team;
const favoriteLeague = preferences.league;
const favoriteSport = preferences.sport;

const Command = () => {
  const [currentType, displaySelectType] = useState("Scheduled Games");
  useEffect(() => {
    async function loadStoredDropdown() {
      const storedValue = await LocalStorage.getItem("favoriteTeamDropdown");

      if (typeof storedValue === "string") {
        displaySelectType(storedValue);
      } else {
        displaySelectType("Scheduled Games");
      }
    }

    loadStoredDropdown();
  }, []);

  const { isLoading: scheduleLoading } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/${favoriteSport}/${favoriteLeague}/teams/${favoriteTeam}/schedule`,
  );

  let searchBarPlaceholder = "Search for a game";

  if (currentType === "Scheduled Games" || currentType === "Completed Games") {
    searchBarPlaceholder = "Search for a game or team";
  }

  if (currentType === "Tracker") {
    searchBarPlaceholder = "Search for an article, player, or transaction";
  }

  return (
    <List
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          onChange={async (newValue) => {
            displaySelectType(newValue);
            await LocalStorage.setItem("favoriteTeamDropdown", newValue);
          }}
          value={currentType}
          defaultValue="Scheduled Games"
        >
          {favoriteLeague !== "wnba" && <List.Dropdown.Item title="Scheduled Games" value="Scheduled Games" />}
          <List.Dropdown.Item title="Completed Games" value="Completed Games" />
          {favoriteSport !== "soccer" && <List.Dropdown.Item title="Tracker" value="Tracker" />}
        </List.Dropdown>
      }
      isLoading={scheduleLoading}
    >
      {currentType === "Scheduled Games" && favoriteLeague !== "wnba" && <ScheduledGames />}

      {currentType === "Completed Games" && (
        <>
          <CompletedGames />
        </>
      )}

      {currentType === "Tracker" && favoriteSport !== "soccer" && <TeamInjuries />}
    </List>
  );
};

export default Command;
