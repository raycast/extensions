import {
  ActionPanel,
  Action,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  Detail,
  Image,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { format, toZonedTime } from "date-fns-tz";
import { getCountryFlag } from "./utils";
import { parseISO } from "date-fns";

interface Preferences {
  timeFormat: string;
  dateFormat: string;
  timezone: string;
}

interface RaceSession {
  date: string;
  time: string;
}

interface Race {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    url: string;
    circuitName: string;
    Location: {
      lat: string;
      long: string;
      locality: string;
      country: string;
    };
  };
  date: string;
  time: string;
  FirstPractice: RaceSession;
  SecondPractice: RaceSession;
  ThirdPractice?: RaceSession; // Not all races have FP3
  Qualifying: RaceSession;
  Sprint?: RaceSession; // Not all races have a Sprint
}

interface RaceTable {
  season: string;
  Races: Race[];
}

interface MRData {
  xmlns: string;
  series: string;
  url: string;
  limit: string;
  offset: string;
  total: string;
  RaceTable: RaceTable;
}

interface ApiResponse {
  MRData: MRData;
}

// Key for local storage
const RACE_SCHEDULE_CACHE_KEY = "raceSchedule2025";

// Helper function to format date and time for sessions
function formatSessionDateTime(session: RaceSession | undefined, preferences: Preferences, timeZone: string) {
  if (!session || !session.date || !session.time) {
    return "N/A";
  }
  const dateTimeStr = `${session.date}T${session.time}`;
  const inputDate = parseISO(dateTimeStr); // Use parseISO for robust parsing
  const zonedDate = toZonedTime(inputDate, timeZone);
  return format(zonedDate, `${preferences.dateFormat} ${preferences.timeFormat}`, { timeZone });
}

function RaceDetailView({ race, preferences }: { race: Race; preferences: Preferences }) {
  const timeZone =
    preferences.timezone === "auto" ? Intl.DateTimeFormat().resolvedOptions().timeZone : preferences.timezone;

  const raceDateTime = formatSessionDateTime({ date: race.date, time: race.time }, preferences, timeZone);
  const fp1DateTime = formatSessionDateTime(race.FirstPractice, preferences, timeZone);
  const fp2DateTime = formatSessionDateTime(race.SecondPractice, preferences, timeZone);
  const fp3DateTime = race.ThirdPractice ? formatSessionDateTime(race.ThirdPractice, preferences, timeZone) : "N/A";
  const qualifyingDateTime = formatSessionDateTime(race.Qualifying, preferences, timeZone);
  const sprintDateTime = race.Sprint ? formatSessionDateTime(race.Sprint, preferences, timeZone) : "N/A";

  let sessionsTable = `
| Session         | Date & Time                     |
|-----------------|---------------------------------|
| Practice 1      | ${fp1DateTime}                   |
| Practice 2      | ${fp2DateTime}                   |
`;
  if (race.ThirdPractice) {
    sessionsTable += `| Practice 3      | ${fp3DateTime}                   |\n`;
  }
  if (race.Sprint) {
    sessionsTable += `| Sprint          | ${sprintDateTime}                |\n`;
  }
  sessionsTable += `| Qualifying      | ${qualifyingDateTime}            |
| **Race**        | **${raceDateTime}**            |
`;

  const markdown = `
# ${race.raceName}
## ${race.Circuit.circuitName}, ${race.Circuit.Location.country} ${getCountryFlag(race.Circuit.Location.country)}

---

### Schedule
${sessionsTable}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${race.raceName} Details`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on Formula1.com" url={race.url} />
          <Action.CopyToClipboard title="Copy Race Date and Time" content={raceDateTime} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Circuit" text={race.Circuit.circuitName} />
          <Detail.Metadata.Label
            title="Location"
            text={`${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="More Info on Formula1.com" target={race.url} text={race.raceName} />
        </Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const [upcomingRaces, setUpcomingRaces] = useState<Race[]>([]);
  const [pastRaces, setPastRaces] = useState<Race[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function loadAndFetchRaceSchedule() {
      setIsLoading(true);
      let cachedDataString: string | undefined;

      try {
        // 1. Try to load from cache first
        cachedDataString = await LocalStorage.getItem<string>(RACE_SCHEDULE_CACHE_KEY);
        if (cachedDataString) {
          const cachedRaces: Race[] = JSON.parse(cachedDataString);
          // Update state with cached data to show something immediately
          const now = new Date();
          const upcoming = cachedRaces.filter((race) => parseISO(`${race.date}T${race.time}`) >= now);
          const past = cachedRaces.filter((race) => parseISO(`${race.date}T${race.time}`) < now);
          setUpcomingRaces(upcoming);
          setPastRaces(
            past.sort((a, b) => parseISO(`${b.date}T${b.time}`).getTime() - parseISO(`${a.date}T${a.time}`).getTime()),
          );
          // Keep isLoading true until fresh data is fetched or fetch fails,
          // or set to false if you want to show cached and then update UI more subtly.
          // For now, let's show loading indicator until fresh data attempt is complete.
        }
      } catch (e) {
        console.error("Failed to load or parse race schedule from cache", e);
        // If cache is corrupted, remove it
        await LocalStorage.removeItem(RACE_SCHEDULE_CACHE_KEY);
      }

      try {
        // 2. Fetch fresh data
        const response = await fetch("http://api.jolpi.ca/ergast/f1/2025.json");
        if (!response.ok) {
          if (!cachedDataString) {
            // Only show error if cache was also empty
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to fetch race schedule",
              message: response.statusText,
            });
          }
          return; // Don't proceed if fetch failed, rely on cache if it exists
        }
        const jsonResponse = (await response.json()) as unknown as ApiResponse;
        const fetchedRacesRaw = jsonResponse.MRData.RaceTable.Races;

        const sortedFetchedRaces = [...fetchedRacesRaw].sort((a, b) => {
          const dateA = parseISO(`${a.date}T${a.time}`);
          const dateB = parseISO(`${b.date}T${b.time}`);
          return dateA.getTime() - dateB.getTime();
        });

        // 3. Compare and update
        const fetchedDataString = JSON.stringify(sortedFetchedRaces);
        if (fetchedDataString !== cachedDataString) {
          const now = new Date();
          const upcoming = sortedFetchedRaces.filter((race) => parseISO(`${race.date}T${race.time}`) >= now);
          const past = sortedFetchedRaces.filter((race) => parseISO(`${race.date}T${race.time}`) < now);

          setUpcomingRaces(upcoming);
          setPastRaces(
            past.sort((a, b) => parseISO(`${b.date}T${b.time}`).getTime() - parseISO(`${a.date}T${a.time}`).getTime()),
          );

          await LocalStorage.setItem(RACE_SCHEDULE_CACHE_KEY, fetchedDataString);
        }
      } catch (error) {
        console.error("Failed to fetch fresh race schedule:", error);
        if (!cachedDataString) {
          // Only show error if cache was also empty
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch race schedule",
            message: String(error),
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadAndFetchRaceSchedule();
  }, []);

  const formatDateTime = (dateStr: string, timeStr: string) => {
    const dateTimeStr = `${dateStr}T${timeStr}`;
    const inputDate = parseISO(dateTimeStr); // Use parseISO
    const timeZone =
      preferences.timezone === "auto" ? Intl.DateTimeFormat().resolvedOptions().timeZone : preferences.timezone;
    const zonedDate = toZonedTime(inputDate, timeZone);
    return format(zonedDate, `${preferences.dateFormat} ${preferences.timeFormat}`, { timeZone });
  };

  // getTimezones function removed as it was for reference and not used. Timezones are in package.json

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search races...">
      <List.Section title="Upcoming Races" subtitle={`${upcomingRaces.length} races`}>
        {upcomingRaces.map((race) => {
          const formattedDateTime = formatDateTime(race.date, race.time);
          const countryFlag = getCountryFlag(race.Circuit.Location.country);
          const iconSource: Image.ImageLike =
            typeof countryFlag === "string" && countryFlag.length <= 2
              ? { source: countryFlag }
              : countryFlag || Icon.Globe;

          return (
            <List.Item
              key={`upcoming-${race.round}`}
              icon={iconSource}
              title={race.raceName}
              subtitle={formattedDateTime}
              accessories={[{ text: race.Circuit.circuitName }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    target={<RaceDetailView race={race} preferences={preferences} />}
                    icon={Icon.List}
                  />
                  <Action.OpenInBrowser title="Open Race Details F1 Site" url={race.url} />
                  <Action.CopyToClipboard title="Copy Date and Time" content={formattedDateTime} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Past Races" subtitle={`${pastRaces.length} races`}>
        {pastRaces.map((race) => {
          const formattedDateTime = formatDateTime(race.date, race.time);
          const countryFlag = getCountryFlag(race.Circuit.Location.country);
          const iconSource: Image.ImageLike =
            typeof countryFlag === "string" && countryFlag.length <= 2
              ? { source: countryFlag }
              : countryFlag || Icon.Globe;

          return (
            <List.Item
              key={`past-${race.round}`}
              icon={iconSource}
              title={race.raceName}
              subtitle={formattedDateTime}
              accessories={[{ text: race.Circuit.circuitName }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    target={<RaceDetailView race={race} preferences={preferences} />}
                    icon={Icon.List}
                  />
                  <Action.OpenInBrowser title="Open Race Details F1 Site" url={race.url} />
                  <Action.CopyToClipboard title="Copy Date and Time" content={formattedDateTime} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
