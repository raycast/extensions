import { List, Icon, Image, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { countryFlags } from "./constants";
import { format } from "date-fns";

interface Session {
  date: string;
  time?: string;
}

interface Result {
  position: string;
  positionText: string;
  points: string;
  Driver: { givenName: string; familyName: string };
  Constructor: { name: string };
  Time?: { time: string };
  status: string;
}

interface Race {
  round: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { locality: string; country: string };
  };
  date: string;
  time?: string;
  FirstPractice?: Session;
  SecondPractice?: Session;
  ThirdPractice?: Session;
  Qualifying?: Session;
  Sprint?: Session;
  SprintQualifying?: Session;
  Results?: Result[];
}

export default function Schedule() {
  // Retrieve the user's formatting preferences (made optional in case they haven't loaded yet)
  const preferences = getPreferenceValues<{
    dateFormat?: string;
    timeFormat?: string;
  }>();

  const { isLoading, data: races = [] } = usePromise(
    async (): Promise<Race[]> => {
      const [scheduleRes, resultsRes] = await Promise.all([
        fetch("https://api.jolpi.ca/ergast/f1/current.json"),
        fetch("https://api.jolpi.ca/ergast/f1/current/results.json?limit=1000"),
      ]);

      const scheduleJson = (await scheduleRes.json()) as {
        MRData: { RaceTable: { Races: Race[] } };
      };
      const resultsJson = (await resultsRes.json()) as {
        MRData: { RaceTable: { Races: Race[] } };
      };

      const allRaces = scheduleJson.MRData.RaceTable.Races;
      const completedRaces = resultsJson.MRData.RaceTable.Races;

      return allRaces.map((race) => {
        const pastRaceMatch = completedRaces.find(
          (r) => r.round === race.round,
        );
        if (pastRaceMatch && pastRaceMatch.Results) {
          race.Results = pastRaceMatch.Results;
        }
        return race;
      });
    },
  );

  const formatSession = (session?: Session) => {
    if (!session) return null;

    // Fallback to defaults if preferences are missing or undefined
    const safeDateFmt = preferences.dateFormat || "MM/dd/yyyy";
    const safeTimeFmt = preferences.timeFormat || "HH:mm";

    // If a session has a date but no time
    if (!session.time) {
      const d = new Date(session.date);
      return format(d, `E, ${safeDateFmt}`);
    }

    const timeString = session.time.endsWith("Z")
      ? session.time
      : `${session.time}Z`;
    const d = new Date(`${session.date}T${timeString}`);

    return format(d, `E, ${safeDateFmt}, ${safeTimeFmt}`);
  };

  const now = new Date();
  const upcomingRaces = races.filter(
    (race) => new Date(`${race.date}T${race.time || "00:00:00Z"}`) > now,
  );
  const pastRaces = races.filter(
    (race) => new Date(`${race.date}T${race.time || "00:00:00Z"}`) <= now,
  );

  const renderRaceItem = (race: Race) => {
    let markdown = `# ${race.raceName}\n**Circuit:** ${race.Circuit.circuitName}\n**Location:** ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}\n\n---\n\n`;

    if (race.Results && race.Results.length > 0) {
      markdown += `### Race Results\n\n| Pos | Driver | Team | Time / Status | Pts |\n|:---:|:---|:---|:---|:---:|\n`;
      race.Results.forEach((res) => {
        let posDisplay = res.position;
        if (["R", "D", "W", "E"].includes(res.positionText)) {
          const statusMap: Record<string, string> = {
            R: "DNF",
            D: "DSQ",
            W: "DNS",
            E: "DSQ",
          };
          posDisplay = statusMap[res.positionText] || res.positionText;
        }
        markdown += `| **${posDisplay}** | ${res.Driver.givenName} ${res.Driver.familyName} | ${res.Constructor.name} | ${res.Time?.time || res.status} | ${res.points} |\n`;
      });
    } else {
      markdown += `![Layout](${race.Circuit.circuitId}.svg?raycast-height=200)\n\n### Session Timings\n\n`;
      const sessions = [
        { label: "Practice 1", val: formatSession(race.FirstPractice) },
        {
          label: race.Sprint ? "Sprint Qualifying" : "Practice 2",
          val: formatSession(race.SecondPractice),
        },
        { label: "Sprint Race", val: formatSession(race.Sprint) },
        { label: "Practice 3", val: formatSession(race.ThirdPractice) },
        { label: "Qualifying", val: formatSession(race.Qualifying) },
        {
          label: "Grand Prix",
          val: formatSession({ date: race.date, time: race.time }),
        },
      ];
      sessions.forEach(
        (s) => s.val && (markdown += `* **${s.label}:** ${s.val}\n`),
      );
    }

    const flagCode = countryFlags[race.Circuit.Location.country];
    const iconState = flagCode
      ? {
          source: `https://raw.githubusercontent.com/HatScripts/circle-flags/gh-pages/flags/${flagCode}.svg`,
          mask: Image.Mask.Circle,
        }
      : race.Results
        ? Icon.CheckCircle
        : Icon.Calendar;

    return (
      <List.Item
        key={race.round}
        title={race.raceName}
        subtitle={`Round ${race.round}`}
        icon={iconState}
        detail={<List.Item.Detail markdown={markdown} />}
      />
    );
  };

  return (
    <List isLoading={isLoading} isShowingDetail>
      {upcomingRaces.length > 0 && (
        <List.Section title="Upcoming Races">
          {upcomingRaces.map(renderRaceItem)}
        </List.Section>
      )}

      {pastRaces.length > 0 && (
        <List.Section title="Past Races">
          {pastRaces.map(renderRaceItem)}
        </List.Section>
      )}
    </List>
  );
}
