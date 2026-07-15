import { Detail, List, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import sportInfo from "../utils/getSportInfo";
import Plays from "../views/playbyplay";
import TeamDetail from "../views/teamDetail";

interface Competitor {
  team: {
    logos: { href: string }[];
    abbreviation: string;
    displayName: string;
    logo: string;
    links: { href: string }[];
    id: string;
  };
  score: {
    displayValue: string;
  };
  records?: { summary: string }[];
  probables?: { athlete: { displayName: string; headshot: string } }[];
}

interface Status {
  type: {
    state: string;
    completed?: boolean;
    detail?: string;
  };
  period?: number;
  displayClock?: string;
}

interface Competition {
  competitors: Competitor[];
  type: { id: number };
  status: Status;
  venue: {
    fullName: string;
    indoor: boolean;
    address: {
      city: string;
      state: string;
      country: string;
    };
  };
  tickets: [
    {
      summary: string;
    },
  ];
  season: {
    year: string;
    slug: string;
  };
}

interface Game {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: Status;
  competitions: Competition[];
  links: { href: string }[];
  season: {
    year: string;
    slug: string;
  };
  displayName: string;
}

interface DayItems {
  title: string;
  games: JSX.Element[];
}

interface Response {
  events: Game[];
  day: { date: string };
}

export default function TeamSchedule({ teamId }: { teamId: string }) {
  const currentLeague = sportInfo.getLeague();
  const currentSport = sportInfo.getSport();

  // Fetch Schedule

  const {
    isLoading: scheduleLoading,
    data: scheduleData,
    revalidate: scheduleRevalidate,
  } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/${currentSport}/${currentLeague}/teams/${teamId}/schedule`,
  );

  const gameItems: DayItems[] = [];
  const games = scheduleData?.events || [];

  games?.forEach((game, index) => {
    const gameDate = new Date(game.date);
    const gameDay = gameDate?.toLocaleDateString([], {
      dateStyle: "medium",
    });

    if (!gameItems?.find((sportGameDay) => sportGameDay?.title === gameDay)) {
      gameItems?.push({
        title: gameDay,
        games: [],
      });
    }

    const sportGameDay = gameItems?.find((sportGameDay) => sportGameDay?.title === gameDay);

    const gameTime = new Date(game?.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let accessoryTitle = gameTime;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Scheduled";
    let period;
    let periodNumber = `${game?.status?.period}`;
    let timeDisplay = game?.status?.displayClock;

    if (currentSport === "hockey") {
      period = "P";
    }

    if (currentSport === "basketball") {
      period = "Q";
    }

    if (currentSport === "football") {
      period = "Q";
    }

    if (currentSport === "baseball") {
      timeDisplay = game?.status?.type?.detail ?? "Unknown";
      period = "";
      periodNumber = "";
    }

    if (currentSport === "soccer") {
      timeDisplay = game?.status?.type?.detail ?? "Unknown";
      period = "";
      periodNumber = "";
    }

    const startingSoonInterval = 15 * 60 * 1000;
    const currentDate = new Date();
    const timeUntilGameStarts = gameDate.getTime() - currentDate.getTime();

    if (timeUntilGameStarts <= startingSoonInterval && game?.status?.type?.state === "pre") {
      accessoryColor = Color.Yellow;
      accessoryIcon = { source: Icon.Warning, tintColor: Color.Yellow };
      accessoryToolTip = "Starting Soon";
    }

    if (game?.competitions?.[0]?.status?.type?.state === "in") {
      accessoryTitle = `${game?.competitions[0]?.competitors[1]?.team.abbreviation} ${game?.competitions[0]?.competitors[1]?.score?.displayValue || "0"} - ${game?.competitions[0]?.competitors[0]?.team?.abbreviation} ${game?.competitions[0]?.competitors[0]?.score?.displayValue || "0"}     ${period}${periodNumber} ${timeDisplay}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (game?.competitions?.[0]?.status?.type?.state === "post") {
      accessoryTitle = `${game?.competitions?.[0]?.competitors?.[1]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[1]?.score?.displayValue || "0"} - ${game?.competitions?.[0]?.competitors?.[0]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[0]?.score?.displayValue || "0"}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (
      game?.competitions?.[0]?.status?.type?.state === "post" &&
      game?.competitions?.[0]?.status?.type?.completed === false
    ) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    let gameTitle = game?.name ?? "Unknown";

    if (currentSport === "hockey") {
      gameTitle = game?.name?.replace(" at ", " vs ");
    }

    sportGameDay?.games.push(
      <List.Item
        key={index}
        title={gameTitle}
        icon={{
          source:
            game?.competitions[0]?.competitors[1]?.team?.logos[0].href ??
            `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${currentLeague}.png&w=100&h=100&transparent=true`,
        }}
        accessories={[
          {
            text: { value: `${accessoryTitle ?? "No Date Found"}`, color: accessoryColor },
            tooltip: accessoryToolTip ?? "Unknown",
          },
          { icon: accessoryIcon },
        ]}
        actions={
          <ActionPanel>
            {currentLeague !== "f1" &&
              currentSport !== "soccer" &&
              game?.competitions?.[0]?.status?.type?.state === "in" && (
                <Action.Push title="View Play by Play" icon={Icon.Stopwatch} target={<Plays gameId={game.id} />} />
              )}

            {currentLeague !== "f1" &&
              currentSport !== "soccer" &&
              game?.competitions?.[0]?.status?.type?.state === "post" && (
                <Action.Push title="View Play by Play" icon={Icon.Stopwatch} target={<Plays gameId={game.id} />} />
              )}

            {currentLeague !== "f1" && (
              <>
                <Action.OpenInBrowser
                  title="View Game Details on ESPN"
                  url={`${game?.links?.[0]?.href ?? `https://www.espn.com/${currentLeague}`}`}
                />

                <Action.Push
                  title={`View ${game?.competitions?.[0]?.competitors?.[1]?.team?.displayName ?? "Away"} Team Details`}
                  icon={Icon.List}
                  target={<TeamDetail teamId={game?.competitions?.[0]?.competitors?.[1]?.team?.id ?? ""} />}
                />
                <Action.Push
                  title={`View ${game?.competitions?.[0]?.competitors?.[0]?.team?.displayName ?? "Home"} Team Details`}
                  icon={Icon.List}
                  target={<TeamDetail teamId={game?.competitions?.[0]?.competitors?.[0]?.team?.id ?? ""} />}
                />
              </>
            )}

            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={scheduleRevalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />

            {currentLeague === "f1" && (
              <>
                <Action.OpenInBrowser
                  title="View Race Details on ESPN"
                  url={`${game?.links?.[0]?.href ?? `https://www.espn.com/${currentLeague}`}`}
                />
                <Action.OpenInBrowser
                  title="View Circuit Details on ESPN"
                  url={`${game?.links?.[2]?.href ?? `https://www.espn.com/${currentLeague}`}`}
                />
              </>
            )}
          </ActionPanel>
        }
      />,
    );
  });

  if (scheduleLoading) {
    return <Detail isLoading={true} />;
  }

  if (!scheduleData || games.length === 0) {
    return <List.EmptyView icon="Empty.png" title="No Results Found" />;
  }

  return (
    <List searchBarPlaceholder="Search for a game or team" isLoading={scheduleLoading}>
      {gameItems?.map((sportGameDay, index) => (
        <List.Section
          key={index}
          title={`${sportGameDay?.title ?? "Unknown"}`}
          subtitle={`${sportGameDay?.games?.length} Game${sportGameDay?.games?.length !== 1 ? "s" : ""}`}
        >
          {sportGameDay?.games}
        </List.Section>
      ))}
    </List>
  );
}
