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
  eventsDate?: { date: string };
}

export default function scoresAndSchedule() {
  // Fetch Men's NCAA Stats

  const [currentLeague, displaySelectLeague] = useState("Men's NCAA Games");
  const { isLoading: mncaaScheduleStats, data: mncaaScoresAndSchedule } = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard",
  );
  const mncaaGames = mncaaScoresAndSchedule?.events || [];
  const mncaaItems = mncaaGames.map((mncaaGame, index) => {
    const gameTime = new Date(mncaaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;

    if (mncaaGame.status.type.state === "in") {
      accessoryTitle = `${mncaaGame.competitions[0].competitors[1].team.abbreviation} ${mncaaGame.competitions[0].competitors[1].score} - ${mncaaGame.competitions[0].competitors[0].team.abbreviation} ${mncaaGame.competitions[0].competitors[0].score}     Q${mncaaGame.status.period} ${mncaaGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryToolTip = "In Progress";
    }

    if (mncaaGame.status.type.state === "post") {
      accessoryTitle = `${mncaaGame.competitions[0].competitors[1].team.abbreviation} ${mncaaGame.competitions[0].competitors[1].score} - ${mncaaGame.competitions[0].competitors[0].team.abbreviation} ${mncaaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryToolTip = "Final";
    }

    if (mncaaGame.status.type.state === "post" && mncaaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    return (
      <List.Item
        key={index}
        title={`${mncaaGame.name}`}
        icon={{ source: mncaaGame.competitions[0].competitors[1].team.logo }}
        accessories={[{ text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip }]}
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
      />
    );
  });

  // Fetch Women's NCAA Stats

  const { isLoading: wncaaScheduleStats, data: wncaaScoresAndSchedule } = useFetch<Response>(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard",
  );

  const wncaaGames = wncaaScoresAndSchedule?.events || [];
  const wncaaItems = wncaaGames.map((wncaaGame, index) => {
    const gameTime = new Date(wncaaGame.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryToolTip;

    if (wncaaGame.status.type.state === "in") {
      accessoryTitle = `${wncaaGame.competitions[0].competitors[1].team.abbreviation} ${wncaaGame.competitions[0].competitors[1].score} - ${wncaaGame.competitions[0].competitors[0].team.abbreviation} ${wncaaGame.competitions[0].competitors[0].score}     Q${wncaaGame.status.period} ${wncaaGame.status.displayClock}`;
      accessoryColor = Color.Green;
      accessoryToolTip = "In Progress";
    }

    if (wncaaGame.status.type.state === "post") {
      accessoryTitle = `${wncaaGame.competitions[0].competitors[1].team.abbreviation} ${wncaaGame.competitions[0].competitors[1].score} - ${wncaaGame.competitions[0].competitors[0].team.abbreviation} ${wncaaGame.competitions[0].competitors[0].score}`;
      accessoryColor = Color.SecondaryText;
      accessoryToolTip = "Final";
    }

    if (wncaaGame.status.type.state === "post" && wncaaGame.status.type.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryColor = Color.Orange;
    }

    return (
      <List.Item
        key={index}
        title={`${wncaaGame.name}`}
        icon={{ source: wncaaGame.competitions[0].competitors[1].team.logo }}
        accessories={[{ text: { value: `${accessoryTitle}`, color: accessoryColor }, tooltip: accessoryToolTip }]}
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
      />
    );
  });

  if (mncaaScheduleStats || wncaaScheduleStats) {
    return <Detail isLoading={true} />;
  }

  const mncaaGamesDate = mncaaScoresAndSchedule?.eventsDate?.date ?? "No date available";
  const mncaaSectionDate = new Date(mncaaGamesDate).toLocaleDateString([], {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });

  const wncaaGamesDate = wncaaScoresAndSchedule?.eventsDate?.date ?? "No date available";
  const wncaaSectionDate = new Date(wncaaGamesDate).toLocaleDateString([], {
    month: "long",
    day: "2-digit",
    year: "numeric",
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
          <List.Section
            title={`${mncaaSectionDate}`}
            subtitle={`${mncaaItems.length} Game${mncaaItems.length !== 1 ? "s" : ""}`}
          >
            {mncaaItems}
          </List.Section>
        </>
      )}

      {currentLeague === "WNCAA" && (
        <>
          <List.Section
            title={`${wncaaSectionDate}`}
            subtitle={`${wncaaItems.length} Game${wncaaItems.length !== 1 ? "s" : ""}`}
          >
            {wncaaItems}
          </List.Section>
        </>
      )}
    </List>
  );
}
