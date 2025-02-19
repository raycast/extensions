import { Detail, List, Color, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

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

interface Response {
  events: Game[];
  day: { date: string };
}

export default function scoresAndSchedule() {
  // Fetch EPL Stats

  const [currentLeague, displaySelectLeague] = useState("EPL");
  const { isLoading: eplScheduleStats, data: eplScoresAndSchedule } = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/ENG.1/scoreboard",
  );

  const eplGames = eplScoresAndSchedule?.events || [];
  const eplItems = eplGames.map((eplGame, index) => {
    const gameTime = new Date(eplGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;

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
      accessoryToolTip = "In Progress";
    }

    if (eplGame.status.type.state === "post") {
      accessoryTitle = `${eplGame.competitions[0].competitors[1].team.abbreviation} ${eplGame.competitions[0].competitors[1].score} - ${eplGame.competitions[0].competitors[0].team.abbreviation} ${eplGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryToolTip = "Final";
    }

    if (eplGame.status.type.state === "post" && eplGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    return (
      <List.Item
        key={index}
        title={`${eplGame.name}`}
        icon={{ source: eplGame.competitions[0].competitors[1].team.logo }}
        accessories={[{ text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip }]}
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
      />
    );
  });

  // Fetch SLL Stats

  const { isLoading: sllScheduleStats, data: sllScoresAndSchedule } = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/ESP.1/scoreboard",
  );
  const sllGames = sllScoresAndSchedule?.events || [];
  const sllItems = sllGames.map((sllGame, index) => {
    const gameTime = new Date(sllGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;

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
      accessoryToolTip = "In Progress";
    }

    if (sllGame.status.type.state === "post") {
      accessoryTitle = `${sllGame.competitions[0].competitors[1].team.abbreviation} ${sllGame.competitions[0].competitors[1].score} - ${sllGame.competitions[0].competitors[0].team.abbreviation} ${sllGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryToolTip = "Final";
    }

    if (sllGame.status.type.state === "post" && sllGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    return (
      <List.Item
        key={index}
        title={`${sllGame.name}`}
        icon={{ source: sllGame.competitions[0].competitors[1].team.logo }}
        accessories={[{ text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip }]}
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
      />
    );
  });

  // Fetch Ger Games

  const { isLoading: gerScheduleStats, data: gerScoresAndSchedule } = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/GER.1/scoreboard",
  );
  const gerGames = gerScoresAndSchedule?.events || [];
  const gerItems = gerGames.map((gerGame, index) => {
    const gameTime = new Date(gerGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;

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
      accessoryToolTip = "In Progress";
    }

    if (gerGame.status.type.state === "post") {
      accessoryTitle = `${gerGame.competitions[0].competitors[1].team.abbreviation} ${gerGame.competitions[0].competitors[1].score} - ${gerGame.competitions[0].competitors[0].team.abbreviation} ${gerGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryToolTip = "Final";
    }

    if (gerGame.status.type.state === "post" && gerGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    return (
      <List.Item
        key={index}
        title={`${gerGame.name}`}
        icon={{ source: gerGame.competitions[0].competitors[1].team.logo }}
        accessories={[{ text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip }]}
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
      />
    );
  });

  // Fetch Ita Games

  const { isLoading: itaScheduleStats, data: itaScoresAndSchedule } = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/ITA.1/scoreboard",
  );
  const itaGames = itaScoresAndSchedule?.events || [];
  const itaItems = itaGames.map((itaGame, index) => {
    const gameTime = new Date(itaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;

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
      accessoryToolTip = "In Progress";
    }

    if (itaGame.status.type.state === "post") {
      accessoryTitle = `${itaGame.competitions[0].competitors[1].team.abbreviation} ${itaGame.competitions[0].competitors[1].score} - ${itaGame.competitions[0].competitors[0].team.abbreviation} ${itaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryToolTip = "Final";
    }

    if (itaGame.status.type.state === "post" && itaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    return (
      <List.Item
        key={index}
        title={`${itaGame.name}`}
        icon={{ source: itaGame.competitions[0].competitors[1].team.logo }}
        accessories={[{ text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip }]}
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
      />
    );
  });

  // Fetch UEFA Games

  const { isLoading: uefaScheduleStats, data: uefaScoresAndSchedule } = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard",
  );
  const uefaGames = uefaScoresAndSchedule?.events || [];
  const uefaItems = uefaGames.map((uefaGame, index) => {
    const gameTime = new Date(uefaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;

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
      accessoryToolTip = "In Progress";
    }

    if (uefaGame.status.type.state === "post") {
      accessoryTitle = `${uefaGame.competitions[0].competitors[1].team.abbreviation} ${uefaGame.competitions[0].competitors[1].score} - ${uefaGame.competitions[0].competitors[0].team.abbreviation} ${uefaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryToolTip = "Final";
    }

    if (uefaGame.status.type.state === "post" && uefaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    return (
      <List.Item
        key={index}
        title={`${uefaGame.name}`}
        icon={{ source: uefaGame.competitions[0].competitors[1].team.logo }}
        accessories={[{ text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip }]}
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
      />
    );
  });

  if (eplScheduleStats || sllScheduleStats || gerScheduleStats || itaScheduleStats || uefaScheduleStats) {
    return <Detail isLoading={true} />;
  }

  const eplGamesDate = eplScoresAndSchedule?.day?.date ?? "No date available";
  const sllGamesDate = sllScoresAndSchedule?.day?.date ?? "No date available";
  const gerGamesDate = gerScoresAndSchedule?.day?.date ?? "No date available";
  const itaGamesDate = itaScoresAndSchedule?.day?.date ?? "No date available";
  const uefaGamesDate = uefaScoresAndSchedule?.day?.date ?? "No date available";

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
          <List.Section
            title={`${eplGamesDate}`}
            subtitle={`${eplItems.length} Game${eplItems.length !== 1 ? "s" : ""}`}
          >
            {eplItems}
          </List.Section>
        </>
      )}

      {currentLeague === "UEFA" && (
        <>
          <List.Section
            title={`${uefaGamesDate}`}
            subtitle={`${uefaItems.length} Game${uefaItems.length !== 1 ? "s" : ""}`}
          >
            {uefaItems}
          </List.Section>
        </>
      )}

      {currentLeague === "SLL" && (
        <>
          <List.Section
            title={`${sllGamesDate}`}
            subtitle={`${sllItems.length} Game${sllItems.length !== 1 ? "s" : ""}`}
          >
            {sllItems}
          </List.Section>
        </>
      )}

      {currentLeague === "GER" && (
        <>
          <List.Section
            title={`${gerGamesDate}`}
            subtitle={`${gerItems.length} Game${gerItems.length !== 1 ? "s" : ""}`}
          >
            {gerItems}
          </List.Section>
        </>
      )}

      {currentLeague === "ITA" && (
        <>
          <List.Section
            title={`${itaGamesDate}`}
            subtitle={`${itaItems.length} Game${itaItems.length !== 1 ? "s" : ""}`}
          >
            {itaItems}
          </List.Section>
        </>
      )}
    </List>
  );
}
