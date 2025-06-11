import { ActionPanel, Icon, List } from "@raycast/api";
import { useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import isToday from "dayjs/plugin/isToday";
import isTomorrow from "dayjs/plugin/isTomorrow";
import isYesterday from "dayjs/plugin/isYesterday";
import relativeTime from "dayjs/plugin/relativeTime";
import { EntryList } from "./components/EntryList";
import { PersonDropdown } from "./components/PersonDropdown";
import { CommonActions } from "./components/CommonActions";
import { checkLinearApp } from "./helpers/isLinearInstalled";
import { useForecast } from "./hooks/useForecast";

dayjs.extend(duration);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);
dayjs.extend(relativeTime);

export default function Command() {
  const [showDetails, setShowDetails] = useCachedState("show-details", false);

  const {
    people,
    isLoadingPeople,
    entries,
    isLoadingEntries,
    viewDate,
    changeViewDate,
    filteredPerson,
    changePerson,
    toggleDone,
    webUrl,
    dayDescription,
    sectionTitle,
    dayjsDate,
  } = useForecast();

  useEffect(() => {
    checkLinearApp();
  }, []);

  const searchBarPlaceholder = filteredPerson === "all" ? `${dayDescription} (${dayjsDate.format("dddd")})` : "Search";

  return (
    <List
      isLoading={isLoadingPeople || isLoadingEntries}
      isShowingDetail={showDetails}
      navigationTitle="Forecast"
      searchBarAccessory={<PersonDropdown people={people} onPersonChange={changePerson} />}
      searchBarPlaceholder={searchBarPlaceholder}
    >
      {isLoadingEntries ? (
        <List.EmptyView icon={Icon.Hourglass} title="Loading Forecast..." />
      ) : (
        <>
          {entries && entries.length > 0 ? (
            <EntryList
              entries={entries}
              filteredPerson={filteredPerson}
              showDetails={showDetails}
              toggleDone={toggleDone}
              setShowDetails={setShowDetails}
              webUrl={webUrl}
              sectionTitle={sectionTitle}
              viewDate={viewDate}
              changeViewDate={changeViewDate}
            />
          ) : (
            <List.EmptyView
              icon={Icon.Calendar}
              title="All Clear"
              description={`${dayDescription} (${dayjsDate.format("dddd")})`}
              actions={
                <ActionPanel>
                  <CommonActions
                    showDetails={showDetails}
                    setShowDetails={setShowDetails}
                    webUrl={webUrl}
                    viewDate={viewDate}
                    changeViewDate={changeViewDate}
                  />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
