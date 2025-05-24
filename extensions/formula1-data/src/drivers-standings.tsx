import { ActionPanel, Action, Icon, List, showToast, Toast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { getNationalityFlag } from "./utils";

interface DriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    permanentNumber: string;
    code: string;
    url: string;
    givenName: string;
    familyName: string;
    dateOfBirth: string;
    nationality: string;
  };
  Constructors: Array<{
    constructorId: string;
    url: string;
    name: string;
    nationality: string;
  }>;
}

interface StandingsList {
  season: string;
  round: string;
  DriverStandings: DriverStanding[];
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

const DRIVER_STANDINGS_CACHE_KEY = "driverStandings2025";

export default function Command() {
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAndFetchDriverStandings() {
      setIsLoading(true);
      let cachedDataString: string | undefined;

      try {
        cachedDataString = await LocalStorage.getItem<string>(DRIVER_STANDINGS_CACHE_KEY);
        if (cachedDataString) {
          const cachedStandings: DriverStanding[] = JSON.parse(cachedDataString);
          setDriverStandings(cachedStandings);
        }
      } catch (e) {
        console.error("Failed to load or parse driver standings from cache", e);
        await LocalStorage.removeItem(DRIVER_STANDINGS_CACHE_KEY);
      }

      try {
        const response = await fetch("http://api.jolpi.ca/ergast/f1/2025/driverStandings.json");
        if (!response.ok) {
          if (!cachedDataString) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to fetch driver standings",
              message: response.statusText,
            });
          }
          return;
        }
        const jsonResponse = (await response.json()) as unknown as ApiResponse;
        const fetchedStandings = jsonResponse.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
        const fetchedDataString = JSON.stringify(fetchedStandings);

        if (fetchedDataString !== cachedDataString) {
          setDriverStandings(fetchedStandings);
          await LocalStorage.setItem(DRIVER_STANDINGS_CACHE_KEY, fetchedDataString);
        }
      } catch (error) {
        console.error("Failed to fetch fresh driver standings:", error);
        if (!cachedDataString) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch driver standings",
            message: String(error),
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadAndFetchDriverStandings();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search drivers...">
      {driverStandings.map((standing) => {
        const driverName = `${standing.Driver.givenName} ${standing.Driver.familyName}`;
        const teamName = standing.Constructors[0]?.name || "N/A";
        const flag = getNationalityFlag(standing.Driver.nationality);
        const driverNumber = standing.Driver.permanentNumber;

        const accessories = [{ text: `${standing.points} pts` }, { text: flag }];
        if (driverNumber) {
          accessories.unshift({ text: `#${driverNumber}` });
        }

        return (
          <List.Item
            key={standing.Driver.driverId}
            icon={Icon.Person}
            title={`${standing.position}. ${driverName}`}
            subtitle={teamName}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title={`Open ${driverName}'s Profile`} url={standing.Driver.url} />
                <Action.CopyToClipboard title="Copy Driver Name" content={driverName} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
