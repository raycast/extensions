import { Detail, List, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
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

export default function scoresAndSchedule() {
  // Fetch NBA Stats

  const dateRange = getPastAndFutureDays(new Date());

  const [currentLeague, displaySelectLeague] = useState("NBA Games");
  const { isLoading: nbaScheduleStats, data: nbaScoresAndSchedule } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateRange}`,
  );

  const nbaDayItems: DayItems[] = [];
  const nbaGames = nbaScoresAndSchedule?.events || [];

  nbaGames.forEach((nbaGame, index) => {
    const gameDate = new Date(nbaGame.date);
    const nbaGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!nbaDayItems.find((nbaDay) => nbaDay.title === nbaGameDay)) {
      nbaDayItems.push({
        title: nbaGameDay,
        games: [],
      });
    }

    const nbaDay = nbaDayItems.find((nbaDay) => nbaDay.title === nbaGameDay);

    const gameTime = new Date(nbaGame.date).toLocaleTimeString([], {
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

    if (timeUntilGameStarts <= startingSoonInterval && nbaGame.status.type.state === "pre") {
      accessoryColor = Color.Yellow;
      accessoryIcon = { source: Icon.Warning, tintColor: Color.Yellow };
      accessoryToolTip = "Starting Soon";
    }

    if (nbaGame.status.type.state === "in") {
      accessoryTitle = `${nbaGame.competitions[0].competitors[1].team.abbreviation} ${nbaGame.competitions[0].competitors[1].score} - ${nbaGame.competitions[0].competitors[0].team.abbreviation} ${nbaGame.competitions[0].competitors[0].score}     Q${nbaGame.status.period} ${nbaGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (nbaGame.status.type.state === "post") {
      accessoryTitle = `${nbaGame.competitions[0].competitors[1].team.abbreviation} ${nbaGame.competitions[0].competitors[1].score} - ${nbaGame.competitions[0].competitors[0].team.abbreviation} ${nbaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (nbaGame.status.type.state === "post" && nbaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    nbaDay?.games.push(
      <List.Item
        key={index}
        title={`${nbaGame.name}`}
        icon={{ source: nbaGame.competitions[0].competitors[1].team.logo }}
        accessories={[
          { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${nbaGame.links[0].href}`} />
            {nbaGame.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={`${nbaGame.competitions[0].competitors[1].team.links[0].href}`}
              />
            )}

            {nbaGame.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={`${nbaGame.competitions[0].competitors[0].team.links[0].href}`}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  // Fetch WNBA Stats

  const { isLoading: wnbaScheduleStats, data: wnbaScoresAndSchedule } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=${dateRange}`,
  );

  const wnbaDayItems: DayItems[] = [];
  const wnbaGames = wnbaScoresAndSchedule?.events || [];

  wnbaGames.forEach((wnbaGame, index) => {
    const gameDate = new Date(wnbaGame.date);
    const wnbaGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!wnbaDayItems.find((wnbaDay) => wnbaDay.title === wnbaGameDay)) {
      wnbaDayItems.push({
        title: wnbaGameDay,
        games: [],
      });
    }

    const wnbaDay = wnbaDayItems.find((wnbaDay) => wnbaDay.title === wnbaGameDay);

    const gameTime = new Date(wnbaGame.date).toLocaleTimeString([], {
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

    if (timeUntilGameStarts <= startingSoonInterval && wnbaGame.status.type.state !== "in") {
      accessoryColor = Color.Yellow;
      accessoryIcon = { source: Icon.Warning, tintColor: Color.Yellow };
      accessoryToolTip = "Starting Soon";
    }

    if (wnbaGame.status.type.state === "in") {
      accessoryTitle = `${wnbaGame.competitions[0].competitors[1].team.abbreviation} ${wnbaGame.competitions[0].competitors[1].score} - ${wnbaGame.competitions[0].competitors[0].team.abbreviation} ${wnbaGame.competitions[0].competitors[0].score}     Q${wnbaGame.status.period} ${wnbaGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (wnbaGame.status.type.state === "post") {
      accessoryTitle = `${wnbaGame.competitions[0].competitors[1].team.abbreviation} ${wnbaGame.competitions[0].competitors[1].score} - ${wnbaGame.competitions[0].competitors[0].team.abbreviation} ${wnbaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (wnbaGame.status.type.state === "post" && wnbaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    wnbaDay?.games.push(
      <List.Item
        key={index}
        title={`${wnbaGame.name}`}
        icon={{ source: wnbaGame.competitions[0].competitors[1].team.logo }}
        accessories={[
          { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${wnbaGame.links[0].href}`} />
            {wnbaGame.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={`${wnbaGame.competitions[0].competitors[1].team.links[0].href}`}
              />
            )}

            {wnbaGame.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={`${wnbaGame.competitions[0].competitors[0].team.links[0].href}`}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  if (nbaScheduleStats || wnbaScheduleStats) {
    return <Detail isLoading={true} />;
  }

  nbaDayItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  wnbaDayItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <List
      searchBarPlaceholder="Search for your favorite team"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" onChange={displaySelectLeague} defaultValue="NBA">
          <List.Dropdown.Item title="NBA" value="NBA" />
          <List.Dropdown.Item title="WNBA" value="WNBA" />
        </List.Dropdown>
      }
      isLoading={nbaScheduleStats}
    >
      {currentLeague === "NBA" && (
        <>
          {nbaDayItems.map((nbaDay, index) => (
            <List.Section
              key={index}
              title={`${nbaDay.title}`}
              subtitle={`${nbaDay.games.length} Game${nbaDay.games.length !== 1 ? "s" : ""}`}
            >
              {nbaDay.games}
            </List.Section>
          ))}
        </>
      )}

      {currentLeague === "WNBA" && (
        <>
          {wnbaDayItems.map((wnbaDay, index) => (
            <List.Section
              key={index}
              title={`${wnbaDay.title}`}
              subtitle={`${wnbaDay.games.length} Game${wnbaDay.games.length !== 1 ? "s" : ""}`}
            >
              {wnbaDay.games}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}
