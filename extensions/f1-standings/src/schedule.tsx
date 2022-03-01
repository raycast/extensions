import { useEffect, useState } from "react";
import { ActionPanel, Action, List, Color, showToast, Toast, popToRoot, Detail } from "@raycast/api";
import fetch from "node-fetch";

import { Race, RaceResult } from "./types";

interface ScheduleState {
  season?: number;
  items?: Race[];
  selectedRound?: number;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<ScheduleState>({});
  useEffect(() => {
    async function fetchSchedule() {
      const season = new Date().getFullYear();
      try {
        const res = await fetch(`https://ergast.com/api/f1/${season}.json`);
        const data = (await res.json()) as any;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const allRaces: Race[] = data.MRData.RaceTable.Races;
        const upcomingRaces: Race[] = allRaces.filter((race) => new Date(race.date) >= today);
        if (allRaces.length == 0) {
          throw new Error("No races found");
        }
        setState({
          items: allRaces,
          season,
          selectedRound: upcomingRaces.length > 0 ? parseInt(upcomingRaces[0].round) : 1000,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: `Could not load ${season} race schedule. Please try later again.`,
        });
        await popToRoot({ clearSearchBar: true });
        setState({
          error: error instanceof Error ? error : new Error("Could not load schedule"),
        });
      }
    }

    fetchSchedule();
  }, []);

  return (
    <List isLoading={!state.items && !state.error} selectedItemId={state.selectedRound?.toString()}>
      <List.Section title={"Season " + state.season}>
        {state.items?.map((item) => (
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
            title={item.raceName + " " + item.season}
            subtitle={item.Circuit.Location.locality + ", " + item.Circuit.Location.country}
            accessoryTitle={item.date}
            actions={
              <ActionPanel title={item.raceName}>
                {parseInt(item.round) < state.selectedRound! && (
                  <Action.Push
                    title="Show Results"
                    target={<RaceResultsView season={state.season!} round={parseInt(item.round)} />}
                  />
                )}
                <Action.OpenInBrowser url={item.Circuit.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

interface RaceResultState {
  result?: RaceResult;
  error?: Error;
}

interface RaceResultViewProps {
  season: number;
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
              title={item.Driver.givenName + " " + item.Driver.familyName}
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
