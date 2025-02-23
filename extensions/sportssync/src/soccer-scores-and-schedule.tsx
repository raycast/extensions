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
  // Fetch EPL Stats

  const dateRange = getPastAndFutureDays(new Date());

  const [currentLeague, displaySelectLeague] = useState("EPL");
  const { isLoading: eplScheduleStats, data: eplScoresAndSchedule } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/ENG.1/scoreboard?dates=${dateRange}`,
  );

  const eplDayItems: DayItems[] = [];
  const eplGames = eplScoresAndSchedule?.events || [];

  eplGames.forEach((eplGame, index) => {
    const gameDate = new Date(eplGame.date);
    const eplGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!eplDayItems.find((eplDay) => eplDay.title === eplGameDay)) {
      eplDayItems.push({
        title: eplGameDay,
        games: [],
      });
    }

    const eplDay = eplDayItems.find((eplDay) => eplDay.title === eplGameDay);
    const gameTime = new Date(eplGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";

    function getSoccerHalfWithSuffix(half: number): string {
      if (half === 1) return `${half}st Half`;
      if (half === 2) return `${half}nd Half`;
      if (half === 3) return `${half}rd Half`;
      return `${half}th Half`;
    }

    const half = eplGame.status.period ?? 0;
    const halfWithSuffix = getSoccerHalfWithSuffix(half);

    if (eplGame.status.type.state === "in") {
      accessoryTitle = `${eplGame.competitions[0].competitors[1].team.abbreviation} ${eplGame.competitions[0].competitors[1].score} - ${eplGame.competitions[0].competitors[0].team.abbreviation} ${eplGame.competitions[0].competitors[0].score}     ${halfWithSuffix} ${eplGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (eplGame.status.type.state === "post") {
      accessoryTitle = `${eplGame.competitions[0].competitors[1].team.abbreviation} ${eplGame.competitions[0].competitors[1].score} - ${eplGame.competitions[0].competitors[0].team.abbreviation} ${eplGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (eplGame.status.type.state === "post" && eplGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    eplDay?.games.push(
      <List.Item
        key={index}
        title={`${eplGame.name}`}
        icon={{ source: eplGame.competitions[0].competitors[1].team.logo }}
        accessories={[
          { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${eplGame.links[0].href}`} />
            {eplGame.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={`${eplGame.competitions[0].competitors[1].team.links[0].href}`}
              />
            )}
            {eplGame.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={`${eplGame.competitions[0].competitors[0].team.links[0].href}`}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  // Fetch UEFA Games

  const { isLoading: uefaScheduleStats, data: uefaScoresAndSchedule } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=${dateRange}`,
  );

  const uefaDayItems: DayItems[] = [];
  const uefaGames = uefaScoresAndSchedule?.events || [];

  uefaGames.forEach((uefaGame, index) => {
    const gameDate = new Date(uefaGame.date);
    const uefaGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!uefaDayItems.find((uefaDay) => uefaDay.title === uefaGameDay)) {
      uefaDayItems.push({
        title: uefaGameDay,
        games: [],
      });
    }

    const uefaDay = uefaDayItems.find((uefaDay) => uefaDay.title === uefaGameDay);
    const gameTime = new Date(uefaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";

    function getSoccerHalfWithSuffix(half: number) {
      if (half === 1) return `${half}st Half`;
      if (half === 2) return `${half}nd Half`;
      return `${half}th Half`;
    }

    const half = uefaGame.status.period ?? 0;
    const halfWithSuffix = getSoccerHalfWithSuffix(half);

    if (uefaGame.status.type.state === "in") {
      accessoryTitle = `${uefaGame.competitions[0].competitors[1].team.abbreviation} ${uefaGame.competitions[0].competitors[1].score} - ${uefaGame.competitions[0].competitors[0].team.abbreviation} ${uefaGame.competitions[0].competitors[0].score}     ${halfWithSuffix} ${uefaGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (uefaGame.status.type.state === "post") {
      accessoryTitle = `${uefaGame.competitions[0].competitors[1].team.abbreviation} ${uefaGame.competitions[0].competitors[1].score} - ${uefaGame.competitions[0].competitors[0].team.abbreviation} ${uefaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (uefaGame.status.type.state === "post" && uefaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    uefaDay?.games.push(
      <List.Item
        key={index}
        title={`${uefaGame.name}`}
        icon={{ source: uefaGame.competitions[0].competitors[1].team.logo }}
        accessories={[
          { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${uefaGame.links[0].href}`} />
            {uefaGame.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={`${uefaGame.competitions[0].competitors[1].team.links[0].href}`}
              />
            )}
            {uefaGame.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={`${uefaGame.competitions[0].competitors[0].team.links[0].href}`}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  // Fetch SLL Stats

  const { isLoading: sllScheduleStats, data: sllScoresAndSchedule } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/ESP.1/scoreboard?dates=${dateRange}`,
  );

  const sllDayItems: DayItems[] = [];
  const sllGames = sllScoresAndSchedule?.events || [];

  sllGames.forEach((sllGame, index) => {
    const gameDate = new Date(sllGame.date);
    const sllGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!sllDayItems.find((sllDay) => sllDay.title === sllGameDay)) {
      sllDayItems.push({
        title: sllGameDay,
        games: [],
      });
    }

    const sllDay = sllDayItems.find((sllDay) => sllDay.title === sllGameDay);
    const gameTime = new Date(sllGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";

    function getSoccerHalfWithSuffix(half: number) {
      if (half === 1) return `${half}st Half`;
      if (half === 2) return `${half}nd Half`;
      return `${half}th Half`;
    }

    const half = sllGame.status.period ?? 0;
    const halfWithSuffix = getSoccerHalfWithSuffix(half);

    if (sllGame.status.type.state === "in") {
      accessoryTitle = `${sllGame.competitions[0].competitors[1].team.abbreviation} ${sllGame.competitions[0].competitors[1].score} - ${sllGame.competitions[0].competitors[0].team.abbreviation} ${sllGame.competitions[0].competitors[0].score}     ${halfWithSuffix} ${sllGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (sllGame.status.type.state === "post") {
      accessoryTitle = `${sllGame.competitions[0].competitors[1].team.abbreviation} ${sllGame.competitions[0].competitors[1].score} - ${sllGame.competitions[0].competitors[0].team.abbreviation} ${sllGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (sllGame.status.type.state === "post" && sllGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    sllDay?.games.push(
      <List.Item
        key={index}
        title={`${sllGame.name}`}
        icon={{ source: sllGame.competitions[0].competitors[1].team.logo }}
        accessories={[
          { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${sllGame.links[0].href}`} />
            {sllGame.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={`${sllGame.competitions[0].competitors[1].team.links[0].href}`}
              />
            )}
            {sllGame.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={`${sllGame.competitions[0].competitors[0].team.links[0].href}`}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  // Fetch Ger Games

  const { isLoading: gerScheduleStats, data: gerScoresAndSchedule } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/GER.1/scoreboard?dates=${dateRange}`,
  );

  const gerDayItems: DayItems[] = [];
  const gerGames = gerScoresAndSchedule?.events || [];

  gerGames.forEach((gerGame, index) => {
    const gameDate = new Date(gerGame.date);
    const gerGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!gerDayItems.find((gerDay) => gerDay.title === gerGameDay)) {
      gerDayItems.push({
        title: gerGameDay,
        games: [],
      });
    }

    const gerDay = gerDayItems.find((gerDay) => gerDay.title === gerGameDay);
    const gameTime = new Date(gerGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";

    function getSoccerHalfWithSuffix(half: number) {
      if (half === 1) return `${half}st Half`;
      if (half === 2) return `${half}nd Half`;
      return `${half}th Half`;
    }

    const half = gerGame.status.period ?? 0;
    const halfWithSuffix = getSoccerHalfWithSuffix(half);

    if (gerGame.status.type.state === "in") {
      accessoryTitle = `${gerGame.competitions[0].competitors[1].team.abbreviation} ${gerGame.competitions[0].competitors[1].score} - ${gerGame.competitions[0].competitors[0].team.abbreviation} ${gerGame.competitions[0].competitors[0].score}     ${halfWithSuffix} ${gerGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (gerGame.status.type.state === "post") {
      accessoryTitle = `${gerGame.competitions[0].competitors[1].team.abbreviation} ${gerGame.competitions[0].competitors[1].score} - ${gerGame.competitions[0].competitors[0].team.abbreviation} ${gerGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (gerGame.status.type.state === "post" && gerGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    gerDay?.games.push(
      <List.Item
        key={index}
        title={`${gerGame.name}`}
        icon={{ source: gerGame.competitions[0].competitors[1].team.logo }}
        accessories={[
          { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${gerGame.links[0].href}`} />
            {gerGame.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={`${gerGame.competitions[0].competitors[1].team.links[0].href}`}
              />
            )}
            {gerGame.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={`${gerGame.competitions[0].competitors[0].team.links[0].href}`}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  // Fetch Ita Games

  const { isLoading: itaScheduleStats, data: itaScoresAndSchedule } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/ITA.1/scoreboard?dates=${dateRange}`,
  );

  const itaDayItems: DayItems[] = [];
  const itaGames = itaScoresAndSchedule?.events || [];

  itaGames.forEach((itaGame, index) => {
    const gameDate = new Date(itaGame.date);
    const itaGameDay = gameDate.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!itaDayItems.find((itaDay) => itaDay.title === itaGameDay)) {
      itaDayItems.push({
        title: itaGameDay,
        games: [],
      });
    }

    const itaDay = itaDayItems.find((itaDay) => itaDay.title === itaGameDay);
    const gameTime = new Date(itaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";

    function getSoccerHalfWithSuffix(half: number) {
      if (half === 1) return `${half}st Half`;
      if (half === 2) return `${half}nd Half`;
      return `${half}th Half`;
    }

    const half = itaGame.status.period ?? 0;
    const halfWithSuffix = getSoccerHalfWithSuffix(half);

    if (itaGame.status.type.state === "in") {
      accessoryTitle = `${itaGame.competitions[0].competitors[1].team.abbreviation} ${itaGame.competitions[0].competitors[1].score} - ${itaGame.competitions[0].competitors[0].team.abbreviation} ${itaGame.competitions[0].competitors[0].score}     ${halfWithSuffix} ${itaGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (itaGame.status.type.state === "post") {
      accessoryTitle = `${itaGame.competitions[0].competitors[1].team.abbreviation} ${itaGame.competitions[0].competitors[1].score} - ${itaGame.competitions[0].competitors[0].team.abbreviation} ${itaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (itaGame.status.type.state === "post" && itaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    itaDay?.games.push(
      <List.Item
        key={index}
        title={`${itaGame.name}`}
        icon={{ source: itaGame.competitions[0].competitors[1].team.logo }}
        accessories={[
          { text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Game Details on ESPN" url={`${itaGame.links[0].href}`} />
            {itaGame.competitions[0].competitors[1].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Away Team Details"
                url={`${itaGame.competitions[0].competitors[1].team.links[0].href}`}
              />
            )}
            {itaGame.competitions[0].competitors[0].team.links?.length > 0 && (
              <Action.OpenInBrowser
                title="View Home Team Details"
                url={`${itaGame.competitions[0].competitors[0].team.links[0].href}`}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  });

  if (eplScheduleStats || uefaScheduleStats || sllScheduleStats || gerScheduleStats || itaScheduleStats) {
    return <Detail isLoading={true} />;
  }

  eplDayItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  sllDayItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  itaDayItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  gerDayItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  uefaDayItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <List
      searchBarPlaceholder="Search for your favorite team"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" onChange={displaySelectLeague} defaultValue="EPL">
          <List.Dropdown.Item title="EPL" value="EPL" />
          <List.Dropdown.Item title="UEFA" value="UEFA" />
          <List.Dropdown.Item title="SLL" value="SLL" />
          <List.Dropdown.Item title="GER" value="GER" />
          <List.Dropdown.Item title="ITA" value="ITA" />
        </List.Dropdown>
      }
      isLoading={eplScheduleStats}
    >
      {currentLeague === "EPL" && (
        <>
          {eplDayItems.map((eplDay, index) => (
            <List.Section
              key={index}
              title={`${eplDay.title}`}
              subtitle={`${eplDay.games.length} Game${eplDay.games.length !== 1 ? "s" : ""}`}
            >
              {eplDay.games}
            </List.Section>
          ))}
        </>
      )}

      {currentLeague === "UEFA" && (
        <>
          {uefaDayItems.map((uefaDay, index) => (
            <List.Section
              key={index}
              title={`${uefaDay.title}`}
              subtitle={`${uefaDay.games.length} Game${uefaDay.games.length !== 1 ? "s" : ""}`}
            >
              {uefaDay.games}
            </List.Section>
          ))}
        </>
      )}

      {currentLeague === "SLL" && (
        <>
          {sllDayItems.map((sllDay, index) => (
            <List.Section
              key={index}
              title={`${sllDay.title}`}
              subtitle={`${sllDay.games.length} Game${sllDay.games.length !== 1 ? "s" : ""}`}
            >
              {sllDay.games}
            </List.Section>
          ))}
        </>
      )}

      {currentLeague === "GER" && (
        <>
          {gerDayItems.map((gerDay, index) => (
            <List.Section
              key={index}
              title={`${gerDay.title}`}
              subtitle={`${gerDay.games.length} Game${gerDay.games.length !== 1 ? "s" : ""}`}
            >
              {gerDay.games}
            </List.Section>
          ))}
        </>
      )}

      {currentLeague === "ITA" && (
        <>
          {itaDayItems.map((itaDay, index) => (
            <List.Section
              key={index}
              title={`${itaDay.title}`}
              subtitle={`${itaDay.games.length} Game${itaDay.games.length !== 1 ? "s" : ""}`}
            >
              {itaDay.games}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}
