import { List, Icon, ActionPanel, Action, Image } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { countryFlags, nationalityFlags, getTeamColor } from "./constants";

// --- TYPES ---
interface Driver {
  driverId: string;
  givenName: string;
  familyName: string;
  url: string;
  nationality: string;
}
interface Constructor {
  constructorId: string;
  name: string;
  url: string;
}
interface DriverStanding {
  position: string;
  points: string;
  Driver: Driver;
  Constructors: Constructor[];
}
interface ConstructorStanding {
  position: string;
  points: string;
  Constructor: Constructor;
}
interface RaceResult {
  round: string;
  raceName: string;
  Circuit?: { Location?: { country?: string } };
  Results?: {
    positionText: string;
    points: string;
    status: string;
    grid: string;
  }[];
}

// API Response Wrappers
interface DriverStandingsResponse {
  MRData?: {
    StandingsTable?: {
      StandingsLists?: { DriverStandings?: DriverStanding[] }[];
    };
  };
}

interface ConstructorStandingsResponse {
  MRData?: {
    StandingsTable?: {
      StandingsLists?: { ConstructorStandings?: ConstructorStanding[] }[];
    };
  };
}

type ViewType = "drivers" | "constructors";

function DriverDetail({
  driver,
  teamName,
}: {
  driver: Driver;
  teamName: string;
}) {
  const { isLoading, data: races = [] } = usePromise(async () => {
    const res = await fetch(
      `https://api.jolpi.ca/ergast/f1/current/drivers/${driver.driverId}/results.json`,
    );

    // Defensive check for bad network response
    if (!res.ok) throw new Error("Failed to fetch driver results");

    const json = (await res.json()) as {
      MRData?: { RaceTable?: { Races?: RaceResult[] } };
    };

    // Safely return empty array if API data is missing
    return json?.MRData?.RaceTable?.Races ?? [];
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${driver.givenName} ${driver.familyName} - Results`}
    >
      <List.Section
        title={`${driver.givenName} ${driver.familyName}`}
        subtitle={teamName}
      >
        {races.map((race) => {
          const res = race.Results?.[0];
          if (!res) return null;

          const country = race.Circuit?.Location?.country;
          const flag = country ? countryFlags[country] : undefined;

          return (
            <List.Item
              key={race.round}
              title={race.raceName}
              subtitle={
                ["R", "D", "W", "E"].includes(res.positionText)
                  ? "DNF"
                  : `P${res.positionText}`
              }
              icon={
                flag
                  ? {
                      source: `https://raw.githubusercontent.com/HatScripts/circle-flags/gh-pages/flags/${flag}.svg`,
                      mask: Image.Mask.Circle,
                    }
                  : Icon.CheckCircle
              }
              accessories={[
                { text: `Started P${res.grid}` },
                { text: `${res.points} pts` },
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function Standings() {
  const [view, setView] = useState<ViewType>("drivers");

  const { isLoading, data } = usePromise(async () => {
    const [dRes, cRes] = await Promise.all([
      fetch("https://api.jolpi.ca/ergast/f1/current/driverStandings.json"),
      fetch("https://api.jolpi.ca/ergast/f1/current/constructorStandings.json"),
    ]);

    // Defensive check for bad network response
    if (!dRes.ok || !cRes.ok) throw new Error("Failed to fetch standings data");

    const dJson = (await dRes.json()) as DriverStandingsResponse;
    const cJson = (await cRes.json()) as ConstructorStandingsResponse;

    return {
      drivers:
        dJson?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ??
        [],
      constructors:
        cJson?.MRData?.StandingsTable?.StandingsLists?.[0]
          ?.ConstructorStandings ?? [],
    };
  });

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Championship"
          onChange={(val) => setView(val as ViewType)}
        >
          <List.Dropdown.Item title="Drivers" value="drivers" />
          <List.Dropdown.Item title="Constructors" value="constructors" />
        </List.Dropdown>
      }
    >
      {view === "drivers" &&
        (data?.drivers || []).map((s) => {
          // ✅ FULLY BULLETPROOF: Skip rendering if core driver data is missing
          if (!s.Driver?.driverId || !s.Driver?.givenName) return null;

          const teamName = s.Constructors?.[0]?.name || "Unknown";
          // We know s.Driver exists here, so we can access nationality safely
          const natCode = nationalityFlags[s.Driver.nationality];

          return (
            <List.Item
              key={s.Driver.driverId}
              title={`${s.position}. ${s.Driver.givenName} ${s.Driver.familyName}`}
              subtitle={teamName}
              icon={
                natCode
                  ? {
                      source: `https://raw.githubusercontent.com/HatScripts/circle-flags/gh-pages/flags/${natCode}.svg`,
                      mask: Image.Mask.Circle,
                    }
                  : Icon.Person
              }
              accessories={[
                {
                  text: `${s.points} pts`,
                  icon: {
                    source: Icon.CircleFilled,
                    tintColor: getTeamColor(teamName),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Results"
                    target={
                      <DriverDetail driver={s.Driver} teamName={teamName} />
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })}
      {view === "constructors" &&
        (data?.constructors || []).map((s) => {
          // ✅ FULLY BULLETPROOF: Skip rendering if core constructor data is missing
          if (!s.Constructor?.constructorId || !s.Constructor?.name)
            return null;

          return (
            <List.Item
              key={s.Constructor.constructorId}
              title={`${s.position}. ${s.Constructor.name}`}
              icon={{
                source: Icon.CircleFilled,
                tintColor: getTeamColor(s.Constructor.name),
              }}
              accessories={[{ text: `${s.points} pts` }]}
            />
          );
        })}
    </List>
  );
}
