import { ActionPanel, Action, Icon, List, showToast, Toast, LocalStorage, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { getNationalityFlag } from "./utils"; // Restored import
import ConstructorDetailView, { ConstructorBasicInfo } from "./constructor-detail"; // Import the new detail view

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
        const nationality = standing.Constructor.nationality;
        const flagIcon = getNationalityFlag(nationality);

        const accessories = [{ text: `${standing.points} pts` }];
        // We will use the flag as the main icon, so no need to add it as an accessory here.
        // if (flagIcon && typeof flagIcon === 'string' && flagIcon.length > 2) { // Check if it's an emoji string
        //   accessories.unshift({ text: flagIcon });
        // }

        const iconSource: Image.ImageLike =
          typeof flagIcon === "string" && flagIcon.length <= 2 ? { source: flagIcon } : flagIcon || Icon.Building;

        return (
          <List.Item
            key={standing.Constructor.constructorId}
            icon={iconSource} // Use flag as icon
            title={`${standing.position}. ${teamName}`}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Function Object() { [Native Code] } Details"
                  icon={Icon.Building}
                  target={
                    <ConstructorDetailView
                      constructorInfo={
                        {
                          constructorId: standing.Constructor.constructorId,
                          name: standing.Constructor.name,
                          nationality: standing.Constructor.nationality,
                          url: standing.Constructor.url,
                        } as ConstructorBasicInfo
                      }
                    />
                  }
                />
                <Action.CopyToClipboard title="Copy Team Name" content={teamName} />
                <Action.OpenInBrowser title={`Open ${teamName}'s Wikipedia Page`} url={standing.Constructor.url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
