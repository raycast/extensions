import { Detail, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { getNationalityFlag } from "./utils";

// Basic Constructor info passed from the list
export interface ConstructorBasicInfo {
  constructorId: string;
  name: string;
  nationality: string;
  url: string; // Wikipedia URL
}

interface ConstructorDetailProps {
  constructorInfo: ConstructorBasicInfo;
}

// Simplified Extended details to be fetched
interface ConstructorExtendedStats {
  championshipsWon?: number;
  currentSeason?: {
    position?: string;
    points?: string;
    wins?: string;
  };
  associatedDrivers?: string[]; // Recent or notable drivers
}

const API_BASE_URL = "http://api.jolpi.ca/ergast/f1";

// Ergast API Response Structures (simplified for this view)
interface ErgastDriver {
  driverId: string;
  givenName: string;
  familyName: string;
  code?: string;
  permanentNumber?: string;
}

interface ErgastRaceResult {
  points: string;
  position: string;
  Driver: ErgastDriver;
  Constructor: { constructorId: string }; // For filtering within results if needed
}

interface ErgastRace {
  season: string;
  round: string;
  raceName: string;
  Results: ErgastRaceResult[];
}

interface ErgastRaceTable {
  Races: ErgastRace[];
}

interface ErgastConstructorStandingData {
  position: string;
  points: string;
  wins: string;
  Constructor: { constructorId: string; name: string; nationality: string };
}

interface ErgastStandingsList {
  season: string;
  ConstructorStandings: ErgastConstructorStandingData[];
}

interface ErgastStandingsTable {
  StandingsLists: ErgastStandingsList[];
  constructorId?: string; // For specific constructor standings endpoint
}

interface ErgastMRData {
  limit: string;
  offset: string;
  total: string;
  StandingsTable?: ErgastStandingsTable;
  RaceTable?: ErgastRaceTable;
}

interface ErgastApiResponse {
  MRData: ErgastMRData;
}

export default function ConstructorDetailView({ constructorInfo }: ConstructorDetailProps) {
  const [stats, setStats] = useState<Partial<ConstructorExtendedStats>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `constructor_detail_${constructorInfo.constructorId}`;

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchConstructorDetails() {
      setIsLoading(true);
      setError(null);

      // Try to load from cache first
      try {
        const cachedData = await LocalStorage.getItem<string>(cacheKey);
        if (cachedData) {
          setStats(JSON.parse(cachedData));
          // Still set isLoading to true initially, then false in finally if no network fetch,
          // or let network fetch control it.
        }
      } catch (e) {
        console.warn("Failed to load constructor details from cache", e);
        // Don't necessarily clear cache here, could be a one-off parse error
      }

      const currentYear = new Date().getFullYear().toString();
      const fetchedStats: Partial<ConstructorExtendedStats> = {};

      try {
        // 1. Fetch all constructor standings for championships (Seasons Participated removed)
        try {
          const allStandingsResponse = await fetch(
            `${API_BASE_URL}/constructors/${constructorInfo.constructorId}/constructorStandings.json?limit=1000`,
            { signal },
          );
          if (!allStandingsResponse.ok) {
            console.warn(
              `Failed to fetch all constructor standings for ${constructorInfo.constructorId}: ${allStandingsResponse.statusText}`,
            );
            fetchedStats.championshipsWon = 0;
          } else {
            const allStandingsData = (await allStandingsResponse.json()) as ErgastApiResponse;
            const allStandingsLists = allStandingsData.MRData.StandingsTable?.StandingsLists || [];
            if (allStandingsLists.length > 0) {
              let championships = 0;
              allStandingsLists.forEach((sl) => {
                if (sl.ConstructorStandings[0]?.position === "1") {
                  championships++;
                }
              });
              fetchedStats.championshipsWon = championships;
            } else {
              fetchedStats.championshipsWon = 0;
            }
          }
        } catch (err) {
          console.warn(`Error fetching all constructor standings for ${constructorInfo.constructorId}:`, err);
          fetchedStats.championshipsWon = 0;
        }

        // 2. Fetch current season standing
        try {
          const currentStandingsResponse = await fetch(`${API_BASE_URL}/${currentYear}/constructorStandings.json`, {
            signal,
          });
          if (!currentStandingsResponse.ok) {
            console.warn(`Could not fetch current season standings: ${currentStandingsResponse.statusText}`);
          } else {
            const currentStandingsData = (await currentStandingsResponse.json()) as ErgastApiResponse;
            const currentSeasonStandingsList =
              currentStandingsData.MRData.StandingsTable?.StandingsLists[0]?.ConstructorStandings || [];
            const teamCurrentStanding = currentSeasonStandingsList.find(
              (cs) => cs.Constructor.constructorId === constructorInfo.constructorId,
            );
            if (teamCurrentStanding) {
              fetchedStats.currentSeason = {
                position: teamCurrentStanding.position,
                points: teamCurrentStanding.points,
                wins: teamCurrentStanding.wins,
              };
            }
          }
        } catch (err) {
          console.warn(`Error fetching current season standings:`, err);
        }

        // 3. Fetch recent/associated drivers from results (e.g., last 100 results for the constructor)
        try {
          const resultsResponse = await fetch(
            `${API_BASE_URL}/constructors/${constructorInfo.constructorId}/results.json?limit=100`,
            { signal },
          );
          if (!resultsResponse.ok) {
            console.warn(`Failed to fetch constructor results for drivers: ${resultsResponse.statusText}`);
          } else {
            const resultsData = (await resultsResponse.json()) as ErgastApiResponse;
            const races = resultsData.MRData.RaceTable?.Races || [];
            const driversSet = new Set<string>();
            // Get drivers from most recent races first
            races.reverse().forEach((race) => {
              race.Results.forEach((result) => {
                if (result.Constructor.constructorId === constructorInfo.constructorId && driversSet.size < 10) {
                  // Limit to 10 unique drivers
                  driversSet.add(`${result.Driver.givenName} ${result.Driver.familyName}`);
                }
              });
            });
            fetchedStats.associatedDrivers = Array.from(driversSet);
          }
        } catch (err) {
          console.warn(`Error fetching constructor results for drivers:`, err);
        }

        setStats(fetchedStats);

        // Save to cache
        try {
          await LocalStorage.setItem(cacheKey, JSON.stringify(fetchedStats));
        } catch (e) {
          console.warn("Failed to save constructor details to cache", e);
        }
      } catch (err) {
        if (err instanceof AbortError) {
          console.log("Fetch aborted for constructor details");
          return;
        }
        console.error("Overall error fetching constructor details:", err);
        setError(err instanceof Error ? err.message : String(err));
        showToast({ style: Toast.Style.Failure, title: "Error fetching constructor data", message: String(err) });
      } finally {
        if (!signal.aborted) {
          setIsLoading(false); // Ensure loading is set to false after fetch/cache attempt
        }
      }
    }

    fetchConstructorDetails();
    return () => controller.abort();
  }, [constructorInfo.constructorId, constructorInfo.name]); // Added name to dep array for safety, though id should be primary

  const constructorNationalityFlag = getNationalityFlag(constructorInfo.nationality);

  const markdown = error
    ? `# Error\n\n${error}`
    : `# ${constructorNationalityFlag} ${constructorInfo.name}

**Nationality:** ${constructorInfo.nationality} ${constructorNationalityFlag}

**Championships Won:** ${stats.championshipsWon !== undefined ? stats.championshipsWon : isLoading ? "Loading..." : "N/A"}

**Current Season (${new Date().getFullYear()}) Standing:**
${
  stats.currentSeason
    ? `- Position: ${stats.currentSeason.position || "N/A"}\n  - Points: ${stats.currentSeason.points || "N/A"}\n  - Wins: ${stats.currentSeason.wins || "N/A"}`
    : isLoading
      ? "Loading..."
      : "Data unavailable for current season"
}

**Associated Drivers (Recent):**
${stats.associatedDrivers && stats.associatedDrivers.length > 0 ? stats.associatedDrivers.join(", ") : isLoading ? "Loading..." : "N/A"}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel title={`${constructorInfo.name} Details`}>
          <Action.OpenInBrowser title="Open Wikipedia Page" url={constructorInfo.url} />
          <Action.CopyToClipboard
            title="Copy Function Object() { [Native Code] } Name"
            content={constructorInfo.name}
          />
          <Action.CopyToClipboard
            title="Copy Function Object() { [Native Code] } ID"
            content={constructorInfo.constructorId}
          />
        </ActionPanel>
      }
    />
  );
}
