import { useEffect, useState } from "react";
import { ActionPanel, Action, List, Color } from "@raycast/api";

import { useRaces, useSeasons } from "../hooks";
import { formatDate, getFlag, getRaceDates } from "../utils";
import RaceSessionDetails from "../components/RaceSessionDetails";
import RaceResultList from "../views/RaceResultList";

function RaceList() {
  const [season, setSeason] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [preselectedRound, setPreselectedRound] = useState<string | undefined>();
  const seasons = useSeasons();
  const [pastRaces, upcomingRaces, isLoading] = useRaces(season);

  useEffect(() => {
    const upcomingRounds = Object.keys(upcomingRaces);
    if (upcomingRounds.length === 0) {
      setPreselectedRound(undefined);
      return;
    }
    setPreselectedRound((_) => upcomingRounds[0]);
  }, [upcomingRaces]);

  return (
    <List
      isLoading={!season || isLoading}
      selectedItemId={preselectedRound}
      onSelectionChange={(selectedRound) => {
        if (typeof selectedRound === "undefined") {
          return;
        }
        const race = pastRaces[selectedRound] || upcomingRaces[selectedRound];
        if (!race) {
          setIsShowingDetail(false);
          return;
        }
        const raceDates = getRaceDates(race);
        if (raceDates.length) {
          return;
        }
        setIsShowingDetail(false);
      }}
      searchBarAccessory={
        <List.Dropdown tooltip="Select season" onChange={(newValue) => setSeason(newValue)} storeValue>
          {seasons.map((season) => (
            <List.Dropdown.Item key={season.season} value={`${season.season}`} title={`${season.season}`} />
          ))}
        </List.Dropdown>
      }
      isShowingDetail={isShowingDetail}
    >
      {season && (
        <List.Section title="Past Races">
          {Object.values(pastRaces).map((race) => {
            const raceDates = getRaceDates(race);
            const accessories = [];
            if (!isShowingDetail && race.date && race.time) {
              accessories.push({ text: formatDate(new Date(race.date + "T" + race.time)) });
            }
            accessories.push({ icon: { source: "flag-checkered.png", tintColor: Color.Green } });

            return (
              <List.Item
                key={race.round}
                id={race.round}
                icon={{ source: `${race.round}.png`, tintColor: Color.PrimaryText }}
                title={`${getFlag(race.Circuit.Location.country)} ${race.raceName} ${race.season}`}
                subtitle={`${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`}
                detail={raceDates.length ? <RaceSessionDetails raceDates={raceDates} /> : undefined}
                actions={
                  <ActionPanel title={race.raceName}>
                    <Action.Push
                      title="Show Results"
                      target={<RaceResultList season={season} round={race.round} />}
                      icon={{ source: "flag-checkered.png", tintColor: Color.Green }}
                    />
                    {raceDates.length ? (
                      <Action
                        title={isShowingDetail ? "Hide Sessions" : "Show Sessions"}
                        onAction={() => setIsShowingDetail((previous) => !previous)}
                      />
                    ) : null}
                    <Action.OpenInBrowser url={race.url || race.Circuit.url} />
                  </ActionPanel>
                }
                accessories={accessories}
              />
            );
          })}
        </List.Section>
      )}
      {season && (
        <List.Section title="Upcoming races">
          {Object.values(upcomingRaces).map((race) => {
            const raceDates = getRaceDates(race);
            const accessories = [];
            if (!isShowingDetail && race.date && race.time) {
              accessories.push({ text: formatDate(new Date(`${race.date}T${race.time}`)) });
            }
            accessories.push({ icon: { source: "flag-checkered.png", tintColor: Color.PrimaryText } });
            return (
              <List.Item
                key={race.round}
                id={race.round}
                icon={{ source: `${race.round}.png`, tintColor: Color.PrimaryText }}
                title={`${getFlag(race.Circuit.Location.country)} ${race.raceName} ${race.season}`}
                subtitle={`${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`}
                detail={raceDates.length ? <RaceSessionDetails raceDates={raceDates} /> : undefined}
                actions={
                  <ActionPanel title={race.raceName}>
                    {raceDates.length ? (
                      <Action
                        title={isShowingDetail ? "Hide Sessions" : "Show Sessions"}
                        onAction={() => setIsShowingDetail((previous) => !previous)}
                      />
                    ) : null}
                    <Action.OpenInBrowser url={race.url || race.Circuit.url} />
                  </ActionPanel>
                }
                accessories={accessories}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

export default RaceList;
