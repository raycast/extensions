import { useEffect, useState } from "react";
import { ActionPanel, Action, List, Color, showToast, Toast, popToRoot } from "@raycast/api";
import fetch from "node-fetch";
import { DriverStanding } from "./types";
interface State {
  season?: number;
  items?: DriverStanding[];
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});
  useEffect(() => {
    async function fetchDrivers() {
      try {
        const res = await fetch("https://ergast.com/api/f1/current/driverStandings.json");
        const data = (await res.json()) as any;
        setState({
          items: data.MRData.StandingsTable.StandingsLists[0].DriverStandings,
          season: data.MRData.StandingsTable.season,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Could not load driver standings",
        });
        await popToRoot({ clearSearchBar: true });
        setState({
          error: error instanceof Error ? error : new Error("Could not load standings"),
        });
      }
    }

    fetchDrivers();
  }, []);

  return (
    <List isLoading={!state.items && !state.error}>
      <List.Section title={String(state.season) ?? ""}>
        {state.items?.map((item) => (
          <List.Item
            key={item.Driver.driverId}
            icon={{
              source: item.position + ".png",
              tintColor: Color.PrimaryText,
            }}
            title={item.Driver.givenName + " " + item.Driver.familyName}
            subtitle={item.Constructors[item.Constructors.length - 1].name}
            accessoryTitle={String(item.points)}
            actions={
              <ActionPanel title={item.Driver.givenName + " " + item.Driver.familyName}>
                <Action.OpenInBrowser url={item.Driver.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
