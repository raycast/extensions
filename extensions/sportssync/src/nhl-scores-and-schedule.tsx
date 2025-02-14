import { Detail, List, Color, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Competitor {
  team: {
    abbreviation: string;
    logo: string;
    links: { href: string }[];
  };
  score: string;
}

interface Status {
  type: {
    state: string;
    completed?: boolean;
  };
  period?: number;
  displayClock?: string;
}

interface Competition {
  competitors: Competitor[];
  type: { id: number };
}

interface Game {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: Status;
  competitions: Competition[];
  links: { href: string }[];
}

interface Response {
  events: Game[];
  day: { date: string };
}

export default function scoresAndSchedule() {
  // Fetch NHL Stats
  const { isLoading: nhlScheduleStats, data: nhlScoresAndSchedule } = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
  );

  const nhlGames = nhlScoresAndSchedule?.events || [];
  const nhlItems: JSX.Element[] = [];

  nhlGames.forEach((nhlGame, index) => {
    const gameTime = new Date(nhlGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;

    if (nhlGame.status.type.state === "in") {
      accessoryTitle = `${nhlGame.competitions[0].competitors[1].team.abbreviation} ${nhlGame.competitions[0].competitors[1].score} - ${nhlGame.competitions[0].competitors[0].team.abbreviation} ${nhlGame.competitions[0].competitors[0].score}     P${nhlGame.status.period} ${nhlGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryToolTip = "In Progress";
    }

    if (nhlGame.status.type.state === "post") {
      accessoryTitle = `${nhlGame.competitions[0].competitors[1].team.abbreviation} ${nhlGame.competitions[0].competitors[1].score} - ${nhlGame.competitions[0].competitors[0].team.abbreviation} ${nhlGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryToolTip = "Final";
    }

    if (nhlGame.status.type.state === "post" && nhlGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    let gameTitle = nhlGame.name.replace(" at ", " vs ");

    const team1 = nhlGame.competitions[0].competitors[0].team.abbreviation;
    const team2 = nhlGame.competitions[0].competitors[1].team.abbreviation;

    if (gameTitle.includes(`${team1} ${team1}`) || gameTitle.includes(`${team2} ${team2}`)) {
      gameTitle = `${team2} vs ${team1}`;
    }

    nhlItems.push(
      <List.Item
        key={index}
        title={gameTitle}
        icon={{ source: nhlGame.competitions[0].competitors[1].team.logo }}
        accessories={[{ text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${nhlGame.links[0].href}`} />
            {nhlGame.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={nhlGame.competitions[0].competitors[1].team.links[0].href}
              />
            )}
            {nhlGame.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={nhlGame.competitions[0].competitors[0].team.links[0].href}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  if (nhlScheduleStats) {
    return <Detail isLoading={true} />;
  }

  if (!nhlScoresAndSchedule) {
    return <Detail markdown="No data found." />;
  }

  const nhlGamesDate = nhlScoresAndSchedule.day.date;

  return (
    <List searchBarPlaceholder="Search for your favorite team" isLoading={nhlScheduleStats}>
      <List.Section title={`${nhlGamesDate}`} subtitle={`${nhlItems.length} Game${nhlItems.length !== 1 ? "s" : ""}`}>
        {nhlItems}
      </List.Section>
    </List>
  );
}
