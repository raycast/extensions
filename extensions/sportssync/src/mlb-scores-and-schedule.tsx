import { Detail, List, Color, Icon, Action, ActionPanel } from "@raycast/api";
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
    detail?: string;
  };
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
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";

    const startingSoonInterval = 15 * 60 * 1000;
    const currentDate = new Date();
    const timeUntilGameStarts = gameDate.getTime() - currentDate.getTime();

    if (timeUntilGameStarts <= startingSoonInterval && game.status.type.state === "pre") {
      accessoryColor = Color.Yellow;
      accessoryIcon = { source: Icon.Warning, tintColor: Color.Yellow };
      accessoryToolTip = "Starting Soon";
    }

    if (game.status.type.state === "in") {
      accessoryTitle = `${game.competitions[0].competitors[1].team.abbreviation} ${game.competitions[0].competitors[1].score} - ${game.competitions[0].competitors[0].team.abbreviation} ${game.competitions[0].competitors[0].score}     ${game.status.type.detail}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (game.status.type.state === "post") {
      accessoryTitle = `${game.competitions[0].competitors[1].team.abbreviation} ${game.competitions[0].competitors[1].score} - ${game.competitions[0].competitors[0].team.abbreviation} ${game.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (game.status.type.state === "post" && game.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    mlbDay?.games.push(
      <List.Item
        key={index}
        title={`${game.name}`}
        icon={{ source: game.competitions[0].competitors[1].team.logo }}
        accessories={[
          { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
          { icon: accessoryIcon },
        ]}
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
