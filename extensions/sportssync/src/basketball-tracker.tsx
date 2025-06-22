import { LocalStorage, List } from "@raycast/api";
import { useEffect, useState } from "react";
import sportInfo from "./utils/getSportInfo";
import getArticles from "./utils/getArticles";
import getInjuries from "./utils/getInjuries";
import getTransactions from "./utils/getTransactions";
import DisplayNews from "./templates/news";
import DisplayInjuries from "./templates/injuries";
import DisplayTransactions from "./templates/transactions";

const displayTrackerInformation = () => {
  const [currentLeague, displaySelectLeague] = useState("NBA Articles");

  useEffect(() => {
    async function loadStoredDropdown() {
      const storedValue = await LocalStorage.getItem("basketballTrackerDropdown");

      if (typeof storedValue === "string") {
        displaySelectLeague(storedValue);
      } else {
        displaySelectLeague("NBA Articles");
      }
    }

    loadStoredDropdown();
  }, []);

  const { articleLoading } = getArticles();
  const { injuryLoading } = getInjuries();
  const { transactionLoading } = getTransactions();

  let searchBarPlaceholder = "Search for a game";

  if (currentLeague.includes("Articles")) {
    searchBarPlaceholder = "Search for an article";
  }

  if (currentLeague.includes("Injuries") || currentLeague.includes("Transactions")) {
    searchBarPlaceholder = "Search for a player, or team";
  }

  if (currentLeague.includes("NBA")) {
    sportInfo.setSportAndLeague("basketball", `nba`);
  } else if (currentLeague.includes("WNBA")) {
    sportInfo.setSportAndLeague("basketball", `wnba`);
  } else if (currentLeague.includes("NCAA M")) {
    sportInfo.setSportAndLeague("basketball", `mens-college-basketball`);
  } else if (currentLeague.includes("NCAA W")) {
    sportInfo.setSportAndLeague("basketball", `womens-college-basketball`);
  }

  return (
    <List
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          onChange={async (newValue) => {
            displaySelectLeague(newValue);
            await LocalStorage.setItem("basketballTrackerDropdown", newValue);
          }}
          value={currentLeague}
          defaultValue="NBA Articles"
        >
          <List.Dropdown.Item title="NBA Articles" value="NBA Articles" />
          <List.Dropdown.Item title="NBA Injuries" value="NBA Injuries" />
          <List.Dropdown.Item title="NBA Transactions" value="NBA Transactions" />
          <List.Dropdown.Item title="WNBA Articles" value="WNBA Articles" />
          <List.Dropdown.Item title="WNBA Injuries" value="WNBA Injuries" />
          <List.Dropdown.Item title="WNBA Transactions" value="WNBA Transactions" />
          <List.Dropdown.Item title="NCAA M Articles" value="NCAA M Articles" />
          <List.Dropdown.Item title="NCAA W Articles" value="NCAA W Articles" />
        </List.Dropdown>
      }
      isLoading={injuryLoading || transactionLoading || articleLoading}
    >
      {currentLeague === "NBA Articles" && (
        <>
          <DisplayNews />
        </>
      )}
      {currentLeague === "NBA Injuries" && (
        <>
          <DisplayInjuries />
        </>
      )}
      {currentLeague === "NBA Transactions" && (
        <>
          <DisplayTransactions />
        </>
      )}
      {currentLeague === "WNBA Articles" && (
        <>
          <DisplayNews />
        </>
      )}
      {currentLeague === "WNBA Injuries" && (
        <>
          <DisplayInjuries />
        </>
      )}
      {currentLeague === "WNBA Transactions" && (
        <>
          <DisplayTransactions />
        </>
      )}
      {currentLeague === "NCAA M Articles" && (
        <>
          <DisplayNews />
        </>
      )}
      {currentLeague === "NCAA W Articles" && (
        <>
          <DisplayNews />
        </>
      )}
    </List>
  );
};

export default displayTrackerInformation;
