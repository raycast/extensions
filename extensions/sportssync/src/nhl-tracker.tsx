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
  const [currentLeague, displaySelectLeague] = useState("Articles");

  useEffect(() => {
    async function loadStoredDropdown() {
      const storedValue = await LocalStorage.getItem("nhlTrackerDropdown");

      if (typeof storedValue === "string") {
        displaySelectLeague(storedValue);
      } else {
        displaySelectLeague("Articles");
      }
    }

    loadStoredDropdown();
  }, []);

  const { articleLoading } = getArticles();
  const { injuryLoading } = getInjuries();
  const { transactionLoading } = getTransactions();

  sportInfo.setSportAndLeague("hockey", `nhl`);

  let searchBarPlaceholder = "Search for a game";

  if (currentLeague === "Articles") {
    searchBarPlaceholder = "Search for an article";
  }

  if (currentLeague === "Injuries" || currentLeague === "Transactions") {
    searchBarPlaceholder = "Search for a player, or team";
  }

  return (
    <List
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          onChange={async (newValue) => {
            displaySelectLeague(newValue);
            await LocalStorage.setItem("nhlTrackerDropdown", newValue);
          }}
          value={currentLeague}
          defaultValue="Articles"
        >
          <List.Dropdown.Item title="Articles" value="Articles" />
          <List.Dropdown.Item title="Injuries" value="Injuries" />
          <List.Dropdown.Item title="Transactions" value="Transactions" />
        </List.Dropdown>
      }
      isLoading={injuryLoading || transactionLoading || articleLoading}
    >
      {currentLeague === "Articles" && (
        <>
          <DisplayNews />
        </>
      )}
      {currentLeague === "Injuries" && (
        <>
          <DisplayInjuries />
        </>
      )}
      {currentLeague === "Transactions" && (
        <>
          <DisplayTransactions />
        </>
      )}
    </List>
  );
};

export default displayTrackerInformation;
