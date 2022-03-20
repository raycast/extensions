import { useEffect, useRef, useState } from "react";
import { ActionPanel, Action, List, Color, showToast, Toast, popToRoot } from "@raycast/api";
import fetch from "node-fetch";
import { Race, RaceResult } from "./types";
import { useSeasons } from "./useSeasons";
import getFlag from "./getFlag";

interface ScheduleState {
  season: string;
  items: Race[];
  selectedRound: number;
  isLoading: boolean;
  isShowingDetail: boolean;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<ScheduleState>({
    season: "",
    items: [],
    selectedRound: 1000,
    isLoading: true,
    isShowingDetail: false,
  });
  const cancelRef = useRef<AbortController | null>(null);
  const seasons = useSeasons();
  useEffect(() => {
    if (!state.season) {
      return;
    }
    async function fetchSchedule() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((previous) => ({
        ...previous,
        isLoading: true,
        isShowingDetail: false,
      }));
      try {
        const res = await fetch(`https://ergast.com/api/f1/${state.season}.json`, {
          method: "get",
          signal: cancelRef.current.signal,
        });
        const data = (await res.json()) as any;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const allRaces: Race[] = data.MRData.RaceTable.Races;
        const upcomingRaces: Race[] = allRaces.filter((race) => new Date(race.date) >= today);
        if (allRaces.length == 0) {
          throw new Error("No races found");
        }
        setState((previous) => ({
          ...previous,
          items: allRaces,
          selectedRound: upcomingRaces.length > 0 ? parseInt(upcomingRaces[0].round) : 1000,
          isLoading: false,
        }));
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: `Could not load ${state.season} race schedule. Please try later again.`,
        });
        await popToRoot({ clearSearchBar: true });
        setState((previous) => ({
          ...previous,
          isLoading: false,
          error: error instanceof Error ? error : new Error("Could not load schedule"),
        }));
      }
    }
    fetchSchedule();
  }, [cancelRef, state.season]);

  useEffect(() => {
    return () => {
      cancelRef?.current?.abort();
    };
  }, []);

  return (
    <List
      isLoading={!state.season || state.isLoading}
      selectedItemId={state.selectedRound?.toString()}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select season"
          onChange={(newValue) => setState((previous) => ({ ...previous, season: newValue }))}
          storeValue
        >
          {seasons.map((season) => (
            <List.Dropdown.Item key={season.season} value={`${season.season}`} title={`${season.season}`} />
          ))}
        </List.Dropdown>
      }
      isShowingDetail={state.isShowingDetail}
    >
      <List.Section title={"Season " + state.season}>
        {state.items.map((item) => (
          <List.Item
            key={item.round.toString()}
            id={item.round.toString()}
            icon={{
              source: item.round + ".png",
              tintColor: Color.PrimaryText,
            }}
            accessoryIcon={{
              source: "flag-checkered.png",
              tintColor: parseInt(item.round) < state.selectedRound! ? Color.Green : Color.PrimaryText,
            }}
            title={getFlag(item.Circuit.Location.country) + " " + item.raceName + " " + item.season}
            subtitle={item.Circuit.Location.locality + ", " + item.Circuit.Location.country}
            accessoryTitle={
              state.isShowingDetail
                ? undefined
                : new Date(item.date + "T" + item.time).toLocaleString([], {
                    year: "numeric",
                    month: "2-digit",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
            }
            detail={parseInt(item.round) < state.selectedRound! ? undefined : <RaceSessionDates item={item} />}
            actions={
              <ActionPanel title={item.raceName}>
                {parseInt(item.round) < state.selectedRound! ? (
                  <Action.Push
                    title="Show Results"
                    target={<RaceResultsView season={state.season} round={parseInt(item.round)} />}
                  />
                ) : (
                  <Action
                    title={state.isShowingDetail ? "Hide Sessions" : "Show Sessions"}
                    onAction={() =>
                      setState((previous) => ({ ...previous, isShowingDetail: !previous.isShowingDetail }))
                    }
                  />
                )}
                <Action.OpenInBrowser url={item.url || item.Circuit.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

interface RaceSessionDatesProps {
  item: Race;
}
function RaceSessionDates({ item }: RaceSessionDatesProps) {
  const dateParagraph = (title: string, date: Date) => {
    return `#### ${title}
${date.toLocaleString([], {
  year: "numeric",
  month: "2-digit",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})}`;
  };
  const parts: [string, Date][] = [];
  parts.push(["Race", new Date(item.date + "T" + item.time)]);

  if (item.FirstPractice && item.FirstPractice.date && item.FirstPractice.time) {
    parts.push(["First Practice", new Date(item.FirstPractice.date + "T" + item.FirstPractice.time)]);
  }
  if (item.SecondPractice && item.SecondPractice.date && item.SecondPractice.time) {
    parts.push(["Second Practice", new Date(item.SecondPractice.date + "T" + item.SecondPractice.time)]);
  }
  if (item.ThirdPractice && item.ThirdPractice.date && item.ThirdPractice.time) {
    parts.push(["Third Practice", new Date(item.ThirdPractice.date + "T" + item.ThirdPractice.time)]);
  }
  if (item.Qualifying && item.Qualifying.date && item.Qualifying.time) {
    parts.push(["Qualifying", new Date(item.Qualifying.date + "T" + item.Qualifying.time)]);
  }
  if (item.Sprint && item.Sprint.date && item.Sprint.time) {
    parts.push(["Sprint", new Date(item.Sprint.date + "T" + item.Sprint.time)]);
  }
  parts.sort(([_, a], [__, b]) => {
    if (a > b) {
      return 1;
    }
    if (a < b) {
      return -1;
    }
    return 0;
  });
  return <List.Item.Detail markdown={parts.map(([title, date]) => dateParagraph(title, date)).join("\n")} />;
}

interface RaceResultState {
  result?: RaceResult;
  error?: Error;
}

interface RaceResultViewProps {
  season: string;
  round: number;
}

function RaceResultsView({ season, round }: RaceResultViewProps) {
  const [state, setState] = useState<RaceResultState>({});

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`https://ergast.com/api/f1/${season}/${round}/results.json`);
        const data = (await res.json()) as any;
        setState({
          result: data.MRData.RaceTable.Races[0],
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Could not load race results",
        });
        await popToRoot({ clearSearchBar: true });
        setState({
          error: error instanceof Error ? error : new Error("Could not load race results"),
        });
      }
    }

    fetchResults();
  }, []);

  return (
    <List isLoading={!state.result && !state.error}>
      {state.result && (
        <List.Section title={state.result.raceName + " " + new Date(state.result.date).toLocaleDateString()}>
          {state.result?.Results.map((item) => (
            <List.Item
              key={item.Driver.driverId}
              icon={{
                source: item.position + ".png",
                tintColor: Color.PrimaryText,
              }}
              title={getFlag(item.Driver.nationality) + " " + item.Driver.givenName + " " + item.Driver.familyName}
              subtitle={item.Constructor.name}
              accessoryTitle={String(item.points)}
              actions={
                <ActionPanel title={item.Driver.givenName + " " + item.Driver.familyName}>
                  <Action.OpenInBrowser url={item.Driver.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
