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
  eventsDate?: { date: string };
}

export default function scoresAndSchedule() {
  // Fetch Men's NCAA Stats

  const dateRange = getPastAndFutureDays(new Date());

  const [currentLeague, displaySelectLeague] = useState("Men's NCAA Games");
  const { isLoading: mncaaScheduleStats, data: mncaaScoresAndSchedule } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateRange}`,
  );

  const mncaaDayItems: DayItems[] = [];
  const mncaaGames = mncaaScoresAndSchedule?.events || [];

  mncaaGames.forEach((mncaaGame, index) => {
    const gameDate = new Date(mncaaGame.date);
    const mncaaGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!mncaaDayItems.find((mncaaDay) => mncaaDay.title === mncaaGameDay)) {
      mncaaDayItems.push({
        title: mncaaGameDay,
        games: [],
      });
    }

    const mncaaDay = mncaaDayItems.find((mncaaDay) => mncaaDay.title === mncaaGameDay);
    const gameTime = new Date(mncaaGame.date).toLocaleTimeString([], {
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

    if (timeUntilGameStarts <= startingSoonInterval && mncaaGame.status.type.state !== "in") {
      accessoryColor = Color.Yellow;
      accessoryIcon = { source: Icon.Warning, tintColor: Color.Yellow };
      accessoryToolTip = "Starting Soon";
    }

    if (mncaaGame.status.type.state === "in") {
      accessoryTitle = `${mncaaGame.competitions[0].competitors[1].team.abbreviation} ${mncaaGame.competitions[0].competitors[1].score} - ${mncaaGame.competitions[0].competitors[0].team.abbreviation} ${mncaaGame.competitions[0].competitors[0].score}     Q${mncaaGame.status.period} ${mncaaGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (mncaaGame.status.type.state === "post") {
      accessoryTitle = `${mncaaGame.competitions[0].competitors[1].team.abbreviation} ${mncaaGame.competitions[0].competitors[1].score} - ${mncaaGame.competitions[0].competitors[0].team.abbreviation} ${mncaaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (mncaaGame.status.type.state === "post" && mncaaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    mncaaDay?.games.push(
      <List.Item
        key={index}
        title={`${mncaaGame.name}`}
        icon={{ source: mncaaGame.competitions[0].competitors[1].team.logo }}
        accessories={[
          { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${mncaaGame.links[0].href}`} />

            {mncaaGame.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={`${mncaaGame.competitions[0].competitors[1].team.links[0].href}`}
              />
            )}
            {mncaaGame.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={`${mncaaGame.competitions[0].competitors[0].team.links[0].href}`}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  // Fetch Women's NCAA Stats

  const { isLoading: wncaaScheduleStats, data: wncaaScoresAndSchedule } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard?dates=${dateRange}`,
  );

  const wncaaDayItems: DayItems[] = [];
  const wncaaGames = wncaaScoresAndSchedule?.events || [];

  wncaaGames.forEach((wncaaGame, index) => {
    const gameDate = new Date(wncaaGame.date);
    const wncaaGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!wncaaDayItems.find((wncaaDay) => wncaaDay.title === wncaaGameDay)) {
      wncaaDayItems.push({
        title: wncaaGameDay,
        games: [],
      });
    }

    const wncaaDay = wncaaDayItems.find((wncaaDay) => wncaaDay.title === wncaaGameDay);
    const gameTime = new Date(wncaaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";

    if (wncaaGame.status.type.state === "in") {
      accessoryTitle = `${wncaaGame.competitions[0].competitors[1].team.abbreviation} ${wncaaGame.competitions[0].competitors[1].score} - ${wncaaGame.competitions[0].competitors[0].team.abbreviation} ${wncaaGame.competitions[0].competitors[0].score}     Q${wncaaGame.status.period} ${wncaaGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (wncaaGame.status.type.state === "post") {
      accessoryTitle = `${wncaaGame.competitions[0].competitors[1].team.abbreviation} ${wncaaGame.competitions[0].competitors[1].score} - ${wncaaGame.competitions[0].competitors[0].team.abbreviation} ${wncaaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (wncaaGame.status.type.state === "post" && wncaaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    wncaaDay?.games.push(
      <List.Item
        key={index}
        title={`${wncaaGame.name}`}
        icon={{ source: wncaaGame.competitions[0].competitors[1].team.logo }}
        accessories={[
          { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${wncaaGame.links[0].href}`} />
            {wncaaGame.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={`${wncaaGame.competitions[0].competitors[1].team.links[0].href}`}
              />
            )}
            {wncaaGame.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={`${wncaaGame.competitions[0].competitors[0].team.links[0].href}`}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  if (mncaaScheduleStats || wncaaScheduleStats) {
    return <Detail isLoading={true} />;
  }

  mncaaDayItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  wncaaDayItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <List
      searchBarPlaceholder="Search for your favorite team"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" onChange={displaySelectLeague} defaultValue="MNCAA">
          <List.Dropdown.Item title="Men's NCAA" value="MNCAA" />
          <List.Dropdown.Item title="Women's NCAA" value="WNCAA" />
        </List.Dropdown>
      }
      isLoading={mncaaScheduleStats}
    >
      {currentLeague === "MNCAA" && (
        <>
          {mncaaDayItems.map((mncaaDay, index) => (
            <List.Section
              key={index}
              title={`${mncaaDay.title}`}
              subtitle={`${mncaaDay.games.length} Game${mncaaDay.games.length !== 1 ? "s" : ""}`}
            >
              {mncaaDay.games}
            </List.Section>
          ))}
        </>
      )}

      {currentLeague === "WNCAA" && (
        <>
          {wncaaDayItems.map((wncaaDay, index) => (
            <List.Section
              key={index}
              title={`${wncaaDay.title}`}
              subtitle={`${wncaaDay.games.length} Game${wncaaDay.games.length !== 1 ? "s" : ""}`}
            >
              {wncaaDay.games}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}
