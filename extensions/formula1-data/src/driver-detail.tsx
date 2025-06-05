import { Detail, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { getNationalityFlag } from "./utils"; // Assuming utils.ts is in the same directory or adjust path

// Basic Driver info passed from the list
export interface DriverBasicInfo {
  driverId: string;
  permanentNumber: string;
  code: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
  teamName: string;
  teamNationality?: string; // Optional: if we have it
  url: string; // Added for Wikipedia link
}

interface DriverDetailProps {
  driver: DriverBasicInfo;
}

interface Constructor {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

interface Circuit {
  circuitId: string;
  url: string;
  circuitName: string;
  Location: {
    lat: string;
    long: string;
    locality: string;
    country: string;
  };
}

interface ErgastRaceResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: { driverId: string }; // Simplified, assuming we already have driver context
  Constructor: Constructor;
  grid: string;
  laps: string;
  status: string; // Crucial for DNF
  Time?: { millis: string; time: string };
  FastestLap?: {
    rank: string;
    lap: string;
    Time: { time: string };
    AverageSpeed?: { units: string; speed: string };
  };
}

interface ErgastRace {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: Circuit;
  date: string;
  time?: string;
  Results: ErgastRaceResult[];
  QualifyingResults?: Array<{
    position: string;
    Constructor: Constructor;
    Driver: { driverId: string };
    number: string;
    Q1?: string;
    Q2?: string;
    Q3?: string;
  }>;
}

interface ErgastRaceTable {
  season?: string;
  driverId?: string;
  Races: ErgastRace[];
}

interface ErgastStandingsList {
  season: string;
  round: string;
  DriverStandings: Array<{
    position: string;
    positionText: string;
    points: string;
    wins: string;
    Driver: { driverId: string };
    Constructors: Array<Constructor>;
  }>;
}

interface ErgastStandingsTable {
  season?: string;
  driverId?: string;
  StandingsLists: ErgastStandingsList[];
}

interface ErgastMRData {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  RaceTable?: ErgastRaceTable;
  StandingsTable?: ErgastStandingsTable;
}

interface ErgastApiResponse {
  MRData: ErgastMRData;
}

interface DriverExtendedStats {
  age?: number;
  debutDate?: string;
  debutYear?: string;
  firstPointsDate?: string;
  firstPoleDate?: string;
  firstVictoryDate?: string;
  championshipsWon: number;
  totalRaces: number;
  totalWins: number;
  totalPodiums: number;
  totalPolePositions: number;
  totalFastestLaps: number;
  totalPoints: string;
  totalDNFs: number;
  averageFinishPosition?: string;
  constructorHistory: string[];
  circuitsRaced: string[];
  lastRaceResult?: string;
  recentQualifyingResult?: string;
  recentPointsScored?: string;
}

const API_BASE_URL = "http://api.jolpi.ca/ergast/f1";

// Common DNF status phrases from Ergast API
const DNF_STATUSES = [
  "Accident",
  "Collision",
  "Engine",
  "Gearbox",
  "Transmission",
  "Clutch",
  "Hydraulics",
  "Electrical",
  "Spun off",
  "Retired",
  "Damage",
  "DNS", // Did Not Start
  "Disqualified",
  "Withdrew",
  "Overheating",
  "Suspension",
  "Brakes",
  "Fuel pressure",
  "Fuel pump",
  "Oil pressure",
  "Oil leak",
  "Radiator",
  "Driveshaft",
  "Water leak",
  "Alternator",
  "Power loss",
  "Turbo",
  "Exhaust",
  "Safety car",
  "Safety", // Sometimes used for retirement under SC
  "Driver unwell",
  "Fatal accident",
  "Not classified", // Not classified often means DNF
  // Avoid statuses that imply finishing, even if laps down e.g. "+1 Lap", "+2 Laps", "Finished"
];

function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function DriverDetailView({ driver }: DriverDetailProps) {
  const [stats, setStats] = useState<Partial<DriverExtendedStats>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `driver_detail_${driver.driverId}`;

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchDriverDetails() {
      setIsLoading(true);
      setError(null);
      let initialDataLoadedFromCache = false;

      try {
        const cachedData = await LocalStorage.getItem<string>(cacheKey);
        if (cachedData) {
          setStats(JSON.parse(cachedData));
          initialDataLoadedFromCache = true;
        }
      } catch (e) {
        console.warn("Failed to load driver details from cache", e);
      }

      let combinedStats: Partial<DriverExtendedStats> = initialDataLoadedFromCache ? stats : {};

      try {
        combinedStats.age = calculateAge(driver.dateOfBirth);

        const resultsResponse = await fetch(`${API_BASE_URL}/drivers/${driver.driverId}/results.json?limit=1000`, {
          signal,
        });
        if (!resultsResponse.ok) throw new Error(`Failed to fetch results: ${resultsResponse.statusText}`);
        const resultsData = (await resultsResponse.json()) as ErgastApiResponse;
        const races = resultsData.MRData.RaceTable?.Races || [];

        let totalWins = 0;
        let totalPodiums = 0;
        let totalCareerPoints = 0;
        const totalRaces = races.length;
        let debutDate = "N/A";
        let debutYear = "N/A";
        let firstVictoryDate = "N/A";
        let firstPointsDate = "N/A";
        let totalFastestLaps = 0;
        let sumFinishPosition = 0;
        let racesFinished = 0;
        let calculatedTotalDNFs = 0;
        const constructorHistorySet = new Set<string>();
        const circuitsRacedSet = new Set<string>();
        let lastRaceResult = "N/A";
        let recentPointsScored = "0";

        if (races.length > 0) {
          debutDate = races[0].date;
          debutYear = races[0].season;
          races.forEach((race) => {
            const raceResult = race.Results[0];
            if (raceResult) {
              constructorHistorySet.add(raceResult.Constructor.name);
              circuitsRacedSet.add(race.Circuit.circuitName);

              const position = parseInt(raceResult.position, 10);

              if (!isNaN(position)) {
                sumFinishPosition += position;
                racesFinished++;
              } else {
                // If position is not a number, it might be a DNF indicator like 'R' or 'W'
                if (DNF_STATUSES.some((status) => raceResult.status.includes(status))) {
                  calculatedTotalDNFs++;
                }
              }
              // Check status for DNF regardless of numeric position, as some DNFs might still get a number
              if (DNF_STATUSES.some((status) => raceResult.status.includes(status)) && isNaN(position)) {
                // this check might be redundant if the above `else` captures it,
                // but some APIs list numeric position even for DNF, status is more reliable
              } else if (DNF_STATUSES.some((status) => raceResult.status.includes(status))) {
                // If it wasn't caught by isNaN(position) but status indicates DNF
                // This aims to capture cases like being classified but still a DNF due to not finishing enough laps etc.
                // A simple DNF_STATUSES check on `raceResult.status` is likely better.
              }
              // Refined DNF check based on status ONLY:
              if (DNF_STATUSES.some((status) => raceResult.status.includes(status))) {
                // totalDNFs++; // This might double count if already counted above. Let's refine
              }

              // Simpler DNF Logic:
              // Reset DNF count for this simpler logic pass
              // totalDNFs = 0; // NO, we are accumulating, do not reset here. The prior logic was a bit convoluted.
              // Correct DNF logic: check status string
              if (DNF_STATUSES.some((s) => raceResult.status.toLowerCase().includes(s.toLowerCase()))) {
                calculatedTotalDNFs++;
              }

              if (position === 1) {
                totalWins++;
                if (firstVictoryDate === "N/A") firstVictoryDate = race.date;
              }
              if (position >= 1 && position <= 3) {
                totalPodiums++;
              }
              const points = parseFloat(raceResult.points);
              if (points > 0 && firstPointsDate === "N/A") {
                firstPointsDate = race.date;
              }
              totalCareerPoints += points;

              if (raceResult.FastestLap?.rank === "1") {
                totalFastestLaps++;
              }
            }
          });
          // Re-calculate DNF based on status for all races after initial loop, to ensure cleaner logic
          calculatedTotalDNFs = 0; // Reset before recalculating correctly
          races.forEach((race) => {
            if (
              race.Results[0] &&
              DNF_STATUSES.some((s) => race.Results[0].status.toLowerCase().includes(s.toLowerCase()))
            ) {
              calculatedTotalDNFs++;
            }
          });

          const lastRace = races[races.length - 1];
          if (lastRace && lastRace.Results[0]) {
            const lastRaceDetails = lastRace.Results[0];
            lastRaceResult = `${lastRaceDetails.positionText} (${lastRace.raceName} ${lastRace.season})`;
            recentPointsScored = lastRaceDetails.points;
          }
        }

        const averageFinishPosition = racesFinished > 0 ? (sumFinishPosition / racesFinished).toFixed(2) : "N/A";
        const constructorHistory = Array.from(constructorHistorySet);
        const circuitsRaced = Array.from(circuitsRacedSet);

        combinedStats = {
          ...combinedStats,
          totalWins,
          totalPodiums,
          totalPoints: totalCareerPoints.toString(),
          totalRaces,
          debutDate,
          debutYear,
          firstVictoryDate,
          firstPointsDate,
          totalFastestLaps,
          averageFinishPosition,
          lastRaceResult,
          recentPointsScored,
          totalDNFs: calculatedTotalDNFs,
          constructorHistory,
          circuitsRaced,
        };

        const qualifyingResponse = await fetch(
          `${API_BASE_URL}/drivers/${driver.driverId}/qualifying.json?limit=1000`,
          { signal },
        );
        if (!qualifyingResponse.ok) throw new Error(`Failed to fetch qualifying: ${qualifyingResponse.statusText}`);
        const qualifyingData = (await qualifyingResponse.json()) as ErgastApiResponse;
        const qualifyingSessions = qualifyingData.MRData.RaceTable?.Races || [];
        let totalPolePositions = 0;
        let firstPoleDate = "N/A";
        let recentQualifyingResult = "N/A";

        if (qualifyingSessions.length > 0) {
          qualifyingSessions.forEach((session) => {
            if (session.QualifyingResults && session.QualifyingResults[0]?.position === "1") {
              totalPolePositions++;
              if (firstPoleDate === "N/A") firstPoleDate = session.date;
            }
          });
          const lastQualifyingSession = qualifyingSessions[qualifyingSessions.length - 1];
          if (
            lastQualifyingSession &&
            lastQualifyingSession.QualifyingResults &&
            lastQualifyingSession.QualifyingResults[0]
          ) {
            recentQualifyingResult = `${lastQualifyingSession.QualifyingResults[0].position} (${lastQualifyingSession.raceName} ${lastQualifyingSession.season})`;
          }
        }
        combinedStats.totalPolePositions = totalPolePositions;
        combinedStats.firstPoleDate = firstPoleDate;
        combinedStats.recentQualifyingResult = recentQualifyingResult;

        try {
          const standingsResponse = await fetch(
            `${API_BASE_URL}/drivers/${driver.driverId}/driverStandings.json?limit=1000`,
            { signal },
          );
          if (!standingsResponse.ok) {
            console.warn(`Failed to fetch standings for ${driver.driverId}: ${standingsResponse.statusText}`);
            combinedStats.championshipsWon = 0;
          } else {
            const standingsData = (await standingsResponse.json()) as ErgastApiResponse;
            const standingsLists = standingsData.MRData.StandingsTable?.StandingsLists || [];
            let championshipsWon = 0;
            standingsLists.forEach((list) => {
              if (list.DriverStandings[0]?.position === "1") {
                championshipsWon++;
              }
            });
            combinedStats.championshipsWon = championshipsWon;
          }
        } catch (standingsError) {
          console.warn(`Error during fetch standings for ${driver.driverId}:`, standingsError);
          combinedStats.championshipsWon = 0;
        }

        setStats(combinedStats);
        await LocalStorage.setItem(cacheKey, JSON.stringify(combinedStats));
      } catch (err) {
        if (err instanceof AbortError) {
          console.log("Fetch aborted for driver details");
          return;
        }
        if (!initialDataLoadedFromCache || (err instanceof Error && error !== err.message)) {
          console.error("Error fetching driver details:", err);
          setError(err instanceof Error ? err.message : String(err));
          showToast({ style: Toast.Style.Failure, title: "Error fetching driver details", message: String(err) });
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchDriverDetails();
    return () => {
      controller.abort();
    };
  }, [driver.driverId, driver.dateOfBirth, cacheKey]);

  const fullName = `${driver.givenName} ${driver.familyName}`;
  const driverNationalityFlag = getNationalityFlag(driver.nationality);

  const markdownContent =
    error && !stats.age // Show error only if no stats are loaded (e.g. from cache)
      ? `# Error\n\n${error}`
      : `
# ${driverNationalityFlag} ${fullName} ${driver.permanentNumber ? `#${driver.permanentNumber}` : ""}

## 🧑‍✈️ Driver Profile Information
| Attribute        | Value                                            |
|------------------|--------------------------------------------------|
| **Full Name**    | ${fullName}                                      |
| **Age**          | ${stats?.age !== undefined ? stats.age : isLoading ? "Loading..." : "N/A"} |
| **Date of Birth**| ${new Date(driver.dateOfBirth).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })} |
| **Nationality**  | ${driver.nationality} ${driverNationalityFlag}    |
| **Team**         | ${driver.teamName}                               |
| **Car Number**   | ${driver.permanentNumber || "N/A"}               |
| **Debut Date**   | ${stats?.debutDate ? new Date(stats.debutDate).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : isLoading ? "Loading..." : "N/A"} |
| **First Points** | ${stats?.firstPointsDate ? new Date(stats.firstPointsDate).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : isLoading ? "Loading..." : "N/A"}   |
| **First Pole**   | ${stats?.firstPoleDate ? new Date(stats.firstPoleDate).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : isLoading ? "Loading..." : "N/A"}     |
| **First Victory**| ${stats?.firstVictoryDate ? new Date(stats.firstVictoryDate).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : isLoading ? "Loading..." : "N/A"}  |
| **Championships**| ${stats?.championshipsWon !== undefined ? stats.championshipsWon : isLoading ? "Loading..." : "0"} |

## 📊 Career Statistics
| Attribute         | Value                                            |
|-------------------|--------------------------------------------------|
| **Total Races**   | ${stats?.totalRaces !== undefined ? stats.totalRaces : isLoading ? "Loading..." : "0"} |
| **Total Wins**    | ${stats?.totalWins !== undefined ? stats.totalWins : isLoading ? "Loading..." : "0"} |
| **Total Podiums** | ${stats?.totalPodiums !== undefined ? stats.totalPodiums : isLoading ? "Loading..." : "0"} |
| **Total Poles**   | ${stats?.totalPolePositions !== undefined ? stats.totalPolePositions : isLoading ? "Loading..." : "0"} |
| **Fastest Laps**  | ${stats?.totalFastestLaps !== undefined ? stats.totalFastestLaps : isLoading ? "Loading..." : "0"} |
| **Career Points** | ${stats?.totalPoints || (isLoading ? "Loading..." : "0")}      |
| **Total DNFs**    | ${stats?.totalDNFs !== undefined ? stats.totalDNFs : isLoading ? "Loading..." : "0"} |
| **Avg. Finish**   | ${stats?.averageFinishPosition || (isLoading ? "Loading..." : "N/A")} |

## 🏁 Recent Performance
| Attribute            | Value                                            |
|----------------------|--------------------------------------------------|
| **Last Race Result** | ${stats?.lastRaceResult || (isLoading ? "Loading..." : "N/A")}    |
| **Recent Quali**     | ${stats?.recentQualifyingResult || (isLoading ? "Loading..." : "N/A")} |
| **Recent Points**    | ${stats?.recentPointsScored || (isLoading ? "Loading..." : "0")} |

## 🏛️ Constructor History
${stats?.constructorHistory && stats.constructorHistory.length > 0 ? stats.constructorHistory.join(", ") : isLoading ? "Loading..." : "N/A"}

## 🌍 Circuits Raced
${stats?.circuitsRaced && stats.circuitsRaced.length > 0 ? stats.circuitsRaced.join(", ") : isLoading ? "Loading..." : "N/A"}
  `;

  return (
    <Detail
      isLoading={isLoading && !Object.keys(stats).length} // Show loading only if no stats (even cached) are available
      markdown={markdownContent}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Full Name" content={fullName} />
          <Action.OpenInBrowser title="Open Wikipedia Profile" url={driver.url} />
        </ActionPanel>
      }
    />
  );
}

// Need to ensure there's a default export for the file if it's intended to be a command itself,
// or ensure it's correctly imported and used by another command file.
// For a view component, this default export is fine.
