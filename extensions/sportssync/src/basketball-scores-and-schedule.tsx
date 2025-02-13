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
  // Fetch NBA Stats

  const [currentLeague, displaySelectLeague] = useState("NBA Games");
  const { isLoading: nbaScheduleStats, data: nbaScoresAndSchedule } = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  );

  const nbaGames = nbaScoresAndSchedule?.events || [];
  const nbaItems = nbaGames.map((nbaGame, index) => {
    const gameTime = new Date(nbaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;

    if (nbaGame.status.type.state === "in") {
      accessoryTitle = `${nbaGame.competitions[0].competitors[1].team.abbreviation} ${nbaGame.competitions[0].competitors[1].score} - ${nbaGame.competitions[0].competitors[0].team.abbreviation} ${nbaGame.competitions[0].competitors[0].score}     Q${nbaGame.status.period} ${nbaGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryToolTip = "In Progress";
    }

    if (nbaGame.status.type.state === "post") {
      accessoryTitle = `${nbaGame.competitions[0].competitors[1].team.abbreviation} ${nbaGame.competitions[0].competitors[1].score} - ${nbaGame.competitions[0].competitors[0].team.abbreviation} ${nbaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryToolTip = "Final";
    }

    if (nbaGame.status.type.state === "post" && nbaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    return (
      <List.Item
        key={index}
        title={`${nbaGame.name}`}
        icon={{ source: nbaGame.competitions[0].competitors[1].team.logo }}
        accessories={[{ text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip }]}
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
      />
    );
  });

  // Fetch WNBA Stats

  const { isLoading: wnbaScheduleStats, data: wnbaScoresAndSchedule } = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard",
  );
  const wnbaGames = wnbaScoresAndSchedule?.events || [];
  const wnbaItems = wnbaGames.map((wnbaGame, index) => {
    const gameTime = new Date(wnbaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;

    if (wnbaGame.status.type.state === "in") {
      accessoryTitle = `${wnbaGame.competitions[0].competitors[1].team.abbreviation} ${wnbaGame.competitions[0].competitors[1].score} - ${wnbaGame.competitions[0].competitors[0].team.abbreviation} ${wnbaGame.competitions[0].competitors[0].score}     Q${wnbaGame.status.period} ${wnbaGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryToolTip = "In Progress";
    }

    if (wnbaGame.status.type.state === "post") {
      accessoryTitle = `${wnbaGame.competitions[0].competitors[1].team.abbreviation} ${wnbaGame.competitions[0].competitors[1].score} - ${wnbaGame.competitions[0].competitors[0].team.abbreviation} ${wnbaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryToolTip = "Final";
    }

    if (wnbaGame.status.type.state === "post" && wnbaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    return (
      <List.Item
        key={index}
        title={`${wnbaGame.name}`}
        icon={{ source: wnbaGame.competitions[0].competitors[1].team.logo }}
        accessories={[{ text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip }]}
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
      />
    );
  });

  if (nbaScheduleStats || wnbaScheduleStats) {
    return <Detail isLoading={true} />;
  }

  const nbaGamesDate = nbaScoresAndSchedule?.day?.date ?? "No date available";
  const wnbaGamesDate = wnbaScoresAndSchedule?.day?.date ?? "No date available";

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
          <List.Section
            title={`${nbaGamesDate}`}
            subtitle={`${nbaItems.length} Game${nbaItems.length !== 1 ? "s" : ""}`}
          >
            {nbaItems}
          </List.Section>
        </>
      )}

      {currentLeague === "WNBA" && (
        <>
          <List.Section
            title={`${wnbaGamesDate}`}
            subtitle={`${wnbaItems.length} Game${wnbaItems.length !== 1 ? "s" : ""}`}
          >
            {wnbaItems}
          </List.Section>
        </>
      )}
    </List>
  );
}
