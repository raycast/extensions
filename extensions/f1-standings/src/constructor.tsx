import { useEffect, useState } from "react";
import { ActionPanel, Action, List, Color, showToast, Toast, popToRoot } from "@raycast/api";
import fetch from "node-fetch";
import { ConstructorStanding } from "./types";
import { useSeasons } from "./useSeasons";
import getFlag from "./getFlag";

interface State {
  season: string;
  items: ConstructorStanding[];
  isLoading: boolean;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({
    season: "",
    items: [],
    isLoading: true,
  });
  const seasons = useSeasons();
  useEffect(() => {
    if (!state.season) {
      return;
    }
    async function fetchConstructors() {
      setState((previous) => ({
        ...previous,
        isLoading: true,
      }));
      try {
        const res = await fetch(`https://ergast.com/api/f1/${state.season}/constructorStandings.json`);
        const data = (await res.json()) as any;
        setState((previous) => ({
          ...previous,
          items: data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [],
          isLoading: false,
        }));
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Could not load constructor standings",
        });
        await popToRoot({ clearSearchBar: true });
        setState((previous) => ({
          ...previous,
          isLoading: false,
          error: error instanceof Error ? error : new Error("Could not load standings"),
        }));
      }
    }

    fetchConstructors();
  }, [state.season]);

  return (
    <List
      isLoading={!state.season || state.isLoading}
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
    >
      <List.Section title={String(state.season) ?? ""}>
        {state.items?.map((item) => (
          <List.Item
            key={item.Constructor.constructorId}
            icon={{
              source: item.position + ".png",
              tintColor: Color.PrimaryText,
            }}
            title={getFlag(item.Constructor?.nationality) + " " + item.Constructor.name}
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
