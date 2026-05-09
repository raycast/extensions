import { List, Icon, ActionPanel, Action, Image } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import fetch from "node-fetch";
import { historicCountryFlags, nationalityFlags } from "./constants";

// --- TYPES ---
interface RaceResult {
  positionText: string;
  points: string;
  status: string;
  Driver: { givenName: string; familyName: string; nationality: string };
  Constructor: { name: string };
  Time?: { time: string };
}

interface Race {
  round: string;
  raceName: string;
  Circuit: { circuitName: string; Location: { country: string } };
  date: string;
}

// API Response Wrappers
interface ErgastResponse<T> {
  MRData: {
    RaceTable: {
      Races: T[];
    };
  };
}

interface ResultsData extends Race {
  Results: RaceResult[];
}

function RaceDetail({ race, year }: { race: Race; year: string }) {
  const { isLoading, data: results = [] } = usePromise(async () => {
    const res = await fetch(
      `https://api.jolpi.ca/ergast/f1/${year}/${race.round}/results.json`,
    );
    // 🟢 FIXED: Defined the structure instead of using 'any'
    const json = (await res.json()) as ErgastResponse<ResultsData>;
    return (json.MRData?.RaceTable?.Races[0]?.Results || []) as RaceResult[];
  });

  return (
    <List isLoading={isLoading} navigationTitle={`${race.raceName} Results`}>
      <List.Section title="Grid Classification">
        {results.map((res, i) => {
          const natCode = nationalityFlags[res.Driver.nationality];
          return (
            <List.Item
              key={i}
              title={`P${res.positionText} - ${res.Driver.givenName} ${res.Driver.familyName}`}
              subtitle={res.Constructor.name}
              icon={
                natCode
                  ? {
                      source: `https://raw.githubusercontent.com/HatScripts/circle-flags/gh-pages/flags/${natCode}.svg`,
                      mask: Image.Mask.Circle,
                    }
                  : Icon.Person
              }
              accessories={[
                { text: res.Time?.time || res.status },
                { text: `${res.points} pts` },
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function HistoricalResults() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const years = Array.from({ length: currentYear - 1949 }, (_, i) =>
    (currentYear - i).toString(),
  );

  const { isLoading, data: races = [] } = usePromise(
    async (y: string) => {
      const res = await fetch(`https://api.jolpi.ca/ergast/f1/${y}.json`);
      // 🟢 FIXED: Type cast to the defined response interface
      const json = (await res.json()) as ErgastResponse<Race>;
      return (json.MRData?.RaceTable?.Races || []) as Race[];
    },
    [year],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Season" value={year} onChange={setYear}>
          {years.map((y) => (
            <List.Dropdown.Item key={y} title={y} value={y} />
          ))}
        </List.Dropdown>
      }
    >
      {races.map((r) => {
        const flag = historicCountryFlags[r.Circuit.Location.country];
        return (
          <List.Item
            key={r.round}
            title={r.raceName}
            subtitle={r.Circuit.circuitName}
            icon={
              flag
                ? {
                    source: `https://raw.githubusercontent.com/HatScripts/circle-flags/gh-pages/flags/${flag}.svg`,
                    mask: Image.Mask.Circle,
                  }
                : Icon.Flag
            }
            accessories={[{ text: `Round ${r.round}` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Results"
                  target={<RaceDetail race={r} year={year} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
