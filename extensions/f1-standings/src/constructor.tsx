import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, List, Color, showToast, Toast, popToRoot } from "@raycast/api";
import fetch from "node-fetch";

interface ConstructorStanding {
  position: number;
  points: number;
  wins: number;
  Constructor: {
    constructorId: string;
    url: string;
    name: string;
    nationality: string;
  };
}

interface State {
  season?: number;
  items?: ConstructorStanding[];
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});
  useEffect(() => {
    async function fetchDrivers() {
      try {
        const res = await fetch("https://ergast.com/api/f1/current/constructorStandings.json");
        const data = (await res.json()) as any;
        setState({
          items: data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings,
          season: data.MRData.StandingsTable.season,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Could not load constructor standings",
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
            key={item.Constructor.constructorId}
            icon={{
              source: item.position + ".png",
              tintColor: Color.PrimaryText,
            }}
            title={item.Constructor.name}
            accessoryTitle={String(item.points)}
            actions={
              <ActionPanel title={item.Constructor.name}>
                <Action.OpenInBrowser url={item.Constructor.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
