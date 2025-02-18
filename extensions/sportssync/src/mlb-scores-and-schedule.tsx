import { Detail, List, Color, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import getPastAndFutureDays from "./utils/getDateRange";

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
}

interface Game {
  id: string;
  name: string;
  date: string;
  status: Status;
  competitions: Competition[];
  links: { href: string }[];
}

interface DayItems {
  title: string;
  games: JSX.Element[];
}

interface Response {
  events: Game[];
  day: { date: string };
}

export default function command() {
  // Fetch MLB Data

  const dateRange = getPastAndFutureDays(new Date());

  const { isLoading, data } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dateRange}`,
  );

  const mlbDayItems: DayItems[] = [];
  const mlbGames = data?.events || [];

  mlbGames.forEach((game, index) => {
    const gameDate = new Date(game.date);
    const mlbGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!mlbDayItems.find((mlbDay) => mlbDay.title === mlbGameDay)) {
      mlbDayItems.push({
        title: mlbGameDay,
        games: [],
      });
    }

    const mlbDay = mlbDayItems.find((mlbDay) => mlbDay.title === mlbGameDay);
    const gameTime = new Date(game.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;

    function getPeriodWithSuffix(period: number | undefined): string {
      if (period === undefined) return "";
      if (period === 1) return `${period}st`;
      if (period === 2) return `${period}nd`;
      if (period === 3) return `${period}rd`;
      if (period >= 4 && period <= 9) return `${period}th`;
      return `${period}`;
    }

    const period = game.status.period;
    const periodWithSuffix = getPeriodWithSuffix(period);

    if (game.status.type.state === "in") {
      accessoryTitle = `${game.competitions[0].competitors[1].team.abbreviation} ${game.competitions[0].competitors[1].score} - ${game.competitions[0].competitors[0].team.abbreviation} ${game.competitions[0].competitors[0].score}     ${periodWithSuffix} ${game.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryToolTip = "In Progress";
    }

    if (game.status.type.state === "post") {
      accessoryTitle = `${game.competitions[0].competitors[1].team.abbreviation} ${game.competitions[0].competitors[1].score} - ${game.competitions[0].competitors[0].team.abbreviation} ${game.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryToolTip = "Final";
    }

    if (game.status.type.state === "post" && game.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    mlbDay?.games.push(
      <List.Item
        key={index}
        title={`${game.name}`}
        icon={{ source: game.competitions[0].competitors[1].team.logo }}
        accessories={[{ text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${game.links[0].href}`} />
            {game.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={`${game.competitions[0].competitors[1].team.links[0].href}`}
              />
            )}
            {game.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={`${game.competitions[0].competitors[0].team.links[0].href}`}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!data) {
    return <Detail markdown="No data found." />;
  }

  mlbDayItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <List searchBarPlaceholder="Search for your favorite team" isLoading={isLoading}>
      {mlbDayItems.map((mlbDay, index) => (
        <List.Section
          key={index}
          title={`${mlbDay.title}`}
          subtitle={`${mlbDay.games.length} Game${mlbDay.games.length !== 1 ? "s" : ""}`}
        >
          {mlbDay.games}
        </List.Section>
      ))}
    </List>
  );
}
