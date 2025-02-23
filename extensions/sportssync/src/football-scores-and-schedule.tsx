import { Detail, List, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import getPastAndFutureDays from "./utils/getDateRange";

interface Game {
  date: string;
  name: string;
  competitions: Competition[];
  status: gameStatus;
  links: { href: string }[];
  shortName: string;
}

interface Competition {
  competitors: Competitor[];
}

interface Competitor {
  team: Team;
  score: string;
}

interface Team {
  abbreviation: string;
  logo: string;
  links: { href: string }[];
}

interface gameStatus {
  type: {
    state: string;
    completed?: boolean;
  };
  period?: number;
  displayClock?: string;
}

interface DayItems {
  title: string;
  games: JSX.Element[];
}

export default function scoresAndSchedule() {
  // Fetch NFL Stats

  const [currentLeague, displaySelectLeague] = useState("NFL Games");

  const dateRange = getPastAndFutureDays(new Date());

  const { isLoading: nflScheduleStats, data: nflScoresAndSchedule } = useFetch<{
    events: Game[];
  }>(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${dateRange}`);

  const nflDayItems: DayItems[] = [];
  const nflGames = nflScoresAndSchedule?.events || [];

  nflGames.forEach((nflGame, index) => {
    const gameDate = new Date(nflGame.date);
    const nflGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!nflDayItems.find((nflDay) => nflDay.title === nflGameDay)) {
      nflDayItems.push({
        title: nflGameDay,
        games: [],
      });
    }

    const nflDay = nflDayItems.find((nflDay) => nflDay.title === nflGameDay);
    const nflGameTime = new Date(nflGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = nflGameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";

    if (nflGame.status.type.state === "in") {
      accessoryTitle = `${nflGame.competitions[0].competitors[1].team.abbreviation} ${nflGame.competitions[0].competitors[1].score} - ${nflGame.competitions[0].competitors[0].team.abbreviation} ${nflGame.competitions[0].competitors[0].score}     Q${nflGame.status.period} ${nflGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (nflGame.status.type.state === "post") {
      accessoryTitle = `${nflGame.competitions[0].competitors[1].team.abbreviation} ${nflGame.competitions[0].competitors[1].score} - ${nflGame.competitions[0].competitors[0].team.abbreviation} ${nflGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (nflGame.status.type.state === "post" && nflGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    nflDay?.games.push(
      <List.Item
        key={index}
        title={`${nflGame.name}`}
        icon={{ source: nflGame.competitions[0].competitors[1].team.logo }}
        accessories={[
          { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${nflGame.links[0].href}`} />
            {nflGame.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={`${nflGame.competitions[0].competitors[1].team.links[0].href}`}
              />
            )}
            {nflGame.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={`${nflGame.competitions[0].competitors[0].team.links[0].href}`}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  // Fetch NCAA Stats
  const { isLoading: ncaaScheduleStats, data: ncaaScoresAndSchedule } = useFetch<{
    events: Game[];
  }>(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=${dateRange}`);

  const ncaaDayItems: DayItems[] = [];
  const ncaaGames = ncaaScoresAndSchedule?.events || [];

  ncaaGames.forEach((ncaaGame, index) => {
    const gameDate = new Date(ncaaGame.date);
    const ncaaGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!ncaaDayItems.find((ncaaDay) => ncaaDay.title === ncaaGameDay)) {
      ncaaDayItems.push({
        title: ncaaGameDay,
        games: [],
      });
    }

    const ncaaDay = ncaaDayItems.find((ncaaDay) => ncaaDay.title === ncaaGameDay);

    const ncaaGameTime = new Date(ncaaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = ncaaGameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";

    const startingSoonInterval = 15 * 60 * 1000;
    const currentDate = new Date();
    const timeUntilGameStarts = gameDate.getTime() - currentDate.getTime();

    if (timeUntilGameStarts <= startingSoonInterval && ncaaGame.status.type.state !== "in") {
      accessoryColor = Color.Yellow;
      accessoryIcon = { source: Icon.Warning, tintColor: Color.Yellow };
      accessoryToolTip = "Starting Soon";
    }

    if (ncaaGame.status.type.state === "in") {
      accessoryTitle = `${ncaaGame.competitions[0].competitors[1].team.abbreviation} ${ncaaGame.competitions[0].competitors[1].score} - ${ncaaGame.competitions[0].competitors[0].team.abbreviation} ${ncaaGame.competitions[0].competitors[0].score}     Q${ncaaGame.status.period} ${ncaaGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (ncaaGame.status.type.state === "post") {
      accessoryTitle = `${ncaaGame.competitions[0].competitors[1].team.abbreviation} ${ncaaGame.competitions[0].competitors[1].score} - ${ncaaGame.competitions[0].competitors[0].team.abbreviation} ${ncaaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (ncaaGame.status.type.state === "post" && ncaaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    if (!ncaaGame.shortName.includes("TBD")) {
      ncaaDay?.games?.push(
        <List.Item
          key={index}
          title={`${ncaaGame.name}`}
          icon={{ source: ncaaGame.competitions[0].competitors[1].team.logo }}
          accessories={[
            { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
            { icon: accessoryIcon },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View Game Details on ESPN" url={`${ncaaGame.links[0].href}`} />
              {ncaaGame.competitions[0].competitors[1].team.links?.length > 0 && (
                <Action.OpenInBrowser
                  title="View Away Team Details"
                  url={`${ncaaGame.competitions[0].competitors[1].team.links[0].href}`}
                />
              )}
              {ncaaGame.competitions[0].competitors[0].team.links?.length > 0 && (
                <Action.OpenInBrowser
                  title="View Home Team Details"
                  url={`${ncaaGame.competitions[0].competitors[0].team.links[0].href}`}
                />
              )}
            </ActionPanel>
          }
        />,
      );
    }
  });

  if (nflScheduleStats || ncaaScheduleStats) {
    return <Detail isLoading={true} />;
  }

  ncaaDayItems.sort((a, b) => new Date(a.title).getTime() - new Date(b.title).getTime());

  return (
    <List
      searchBarPlaceholder="Search for your favorite team"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" onChange={displaySelectLeague} defaultValue="NFL">
          <List.Dropdown.Item title="NFL" value="NFL" />
          <List.Dropdown.Item title="NCAA" value="NCAA" />
        </List.Dropdown>
      }
      isLoading={nflScheduleStats}
    >
      {currentLeague === "NFL" && (
        <>
          {nflDayItems.map((nflDay, index) => (
            <List.Section
              key={index}
              title={`${nflDay.title}`}
              subtitle={`${nflDay.games.length} Game${nflDay.games.length !== 1 ? "s" : ""}`}
            >
              {nflDay.games}
            </List.Section>
          ))}
        </>
      )}

      {currentLeague === "NCAA" && (
        <>
          {ncaaDayItems.map((ncaaDay, index) => (
            <List.Section
              key={index}
              title={`${ncaaDay.title}`}
              subtitle={`${ncaaDay.games.length} Game${ncaaDay.games.length !== 1 ? "s" : ""}`}
            >
              {ncaaDay.games}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}
