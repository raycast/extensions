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
  const [currentLeague, displaySelectLeague] = useState("NFL Articles");

  useEffect(() => {
    async function loadStoredDropdown() {
      const storedValue = await LocalStorage.getItem("footballTrackerDropdown");

      if (typeof storedValue === "string") {
        displaySelectLeague(storedValue);
      } else {
        displaySelectLeague("NFL Articles");
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

  if (currentLeague.includes("NFL")) {
    sportInfo.setSportAndLeague("football", `nfl`);
  } else if (currentLeague.includes("NCAA")) {
    sportInfo.setSportAndLeague("football", `college-football`);
  }

  return (
    <List
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          onChange={async (newValue) => {
            displaySelectLeague(newValue);
            await LocalStorage.setItem("footballTrackerDropdown", newValue);
          }}
          value={currentLeague}
          defaultValue="NFL Articles"
        >
          <List.Dropdown.Item title="NFL Articles" value="NFL Articles" />
          <List.Dropdown.Item title="NFL Injuries" value="NFL Injuries" />
          <List.Dropdown.Item title="NFL Transactions" value="NFL Transactions" />
          <List.Dropdown.Item title="NCAA Articles" value="NCAA Articles" />
        </List.Dropdown>
      }
      isLoading={injuryLoading || transactionLoading || articleLoading}
    >
      {currentLeague === "NFL Articles" && (
        <>
          <DisplayNews />
        </>
      )}
      {currentLeague === "NFL Injuries" && (
        <>
          <DisplayInjuries />
        </>
      )}
      {currentLeague === "NFL Transactions" && (
        <>
          <DisplayTransactions />
        </>
      )}
      {currentLeague === "NCAA Articles" && (
        <>
          <DisplayNews />
        </>
      )}
    </List>
  );
};

export default displayTrackerInformation;
