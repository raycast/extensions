import { ActionPanel, Action, Icon, List, showToast, Toast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { getNationalityFlag } from "./utils"; // Restored import

interface ConstructorStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: {
    constructorId: string;
    url: string;
    name: string;
    nationality: string;
  };
}

interface StandingsList {
  season: string;
  round: string;
  ConstructorStandings: ConstructorStanding[];
}

interface MRData {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  StandingsTable: {
    season: string;
    StandingsLists: StandingsList[];
  };
}

interface ApiResponse {
  MRData: MRData;
}

const CONSTRUCTOR_STANDINGS_CACHE_KEY = "constructorStandings2025";

export default function Command() {
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAndFetchConstructorStandings() {
      setIsLoading(true);
      let cachedDataString: string | undefined;

      try {
        cachedDataString = await LocalStorage.getItem<string>(CONSTRUCTOR_STANDINGS_CACHE_KEY);
        if (cachedDataString) {
          const cachedStandings: ConstructorStanding[] = JSON.parse(cachedDataString);
          setConstructorStandings(cachedStandings);
        }
      } catch (e) {
        console.error("Failed to load or parse constructor standings from cache", e);
        await LocalStorage.removeItem(CONSTRUCTOR_STANDINGS_CACHE_KEY);
      }

      try {
        const response = await fetch("http://api.jolpi.ca/ergast/f1/2025/constructorStandings.json");
        if (!response.ok) {
          if (!cachedDataString) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to fetch constructor standings",
              message: response.statusText,
            });
          }
          return;
        }
        const jsonResponse = (await response.json()) as unknown as ApiResponse;
        const fetchedStandings = jsonResponse.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || [];
        const fetchedDataString = JSON.stringify(fetchedStandings);

        if (fetchedDataString !== cachedDataString) {
          setConstructorStandings(fetchedStandings);
          await LocalStorage.setItem(CONSTRUCTOR_STANDINGS_CACHE_KEY, fetchedDataString);
        }
      } catch (error) {
        console.error("Failed to fetch fresh constructor standings:", error);
        if (!cachedDataString) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch constructor standings",
            message: String(error),
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadAndFetchConstructorStandings();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search constructors...">
      {constructorStandings.map((standing) => {
        const teamName = standing.Constructor.name;
        const flag = getNationalityFlag(standing.Constructor.nationality);
        const accessories = [{ text: `${standing.points} pts` }];
        if (flag) {
          accessories.unshift({ text: flag });
        }

        return (
          <List.Item
            key={standing.Constructor.constructorId}
            icon={Icon.Building} // Reverted to Icon.Building
            title={`${standing.position}. ${teamName}`}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title={`Open ${teamName}'s Profile`} url={standing.Constructor.url} />
                <Action.CopyToClipboard title="Copy Team Name" content={teamName} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
