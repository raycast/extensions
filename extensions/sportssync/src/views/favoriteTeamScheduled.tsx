import { Detail, List, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";

const favoriteTeam = getPreferenceValues().team as string;
const favoriteLeague = getPreferenceValues().league as string;
const favoriteSport = getPreferenceValues().sport as string;

interface Competitor {
  team: {
    logos: { href: string }[];
    abbreviation: string;
    displayName: string;
    logo: string;
    links: { href: string }[];
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

export default function ScheduledGames() {
  // Fetch Schedule

  const {
    isLoading: scheduleLoading,
    data: scheduleData,
    revalidate: scheduleRevalidate,
  } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/${favoriteSport}/${favoriteLeague}/teams/${favoriteTeam}/schedule`,
  );

  if (scheduleLoading) {
    return <Detail isLoading={true} />;
  }

  const gameItems: DayItems[] = [];
  const games = scheduleData?.events || [];

  games?.forEach((game, index) => {
    const gameDate = new Date(game?.date);
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

    if (favoriteSport === "hockey") {
      period = "P";
    }

    if (favoriteSport === "basketball") {
      period = "Q";
    }

    if (favoriteSport === "football") {
      period = "Q";
    }

    if (favoriteSport === "baseball") {
      timeDisplay = game?.status?.type?.detail ?? "Unknown";
      period = "";
      periodNumber = "";
    }

    if (favoriteSport === "soccer") {
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
      accessoryTitle = `${game?.competitions?.[0]?.competitors?.[1]?.team.abbreviation} ${game?.competitions?.[0]?.competitors[1]?.score} - ${game?.competitions?.[0]?.competitors?.[0]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[0]?.score.displayValue}    ${period}${periodNumber} ${timeDisplay}`;
      accessoryColor = Color.Green;
      accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
      accessoryToolTip = "In Progress";
    }

    if (game?.status?.type?.state === "post" && game?.status?.type?.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    let gameTitle = game?.name ?? "Unknown";

    if (favoriteSport === "hockey") {
      gameTitle = game?.name?.replace(" at ", " vs ");
    }

    if (game?.competitions?.[0]?.status?.type?.completed === false)
      sportGameDay?.games.push(
        <List.Item
          key={index}
          title={gameTitle}
          icon={{
            source:
              game?.competitions[0]?.competitors[1]?.team?.logos[0].href ??
              `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${favoriteLeague}.png&w=100&h=100&transparent=true`,
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
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={scheduleRevalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.OpenInBrowser
                title="View Game Details on ESPN"
                url={`${game?.links?.[0]?.href ?? `https://www.espn.com/${favoriteLeague}`}`}
              />

              <>
                {game?.competitions?.[0]?.competitors?.[1]?.team.links?.length > 0 && (
                  <Action.OpenInBrowser
                    title={`View ${game?.competitions?.[0]?.competitors?.[1]?.team?.displayName ?? "Away"} Team Details`}
                    url={
                      game?.competitions?.[0]?.competitors?.[1]?.team?.links?.[0]?.href ??
                      `https://www.espn.com/${favoriteLeague}`
                    }
                  />
                )}
                {game.competitions?.[0]?.competitors?.[0]?.team?.links?.length > 0 && (
                  <Action.OpenInBrowser
                    title={`View ${game?.competitions?.[0]?.competitors?.[0]?.team?.displayName ?? "Home"} Team Details`}
                    url={
                      game?.competitions?.[0]?.competitors?.[0]?.team?.links?.[0]?.href ??
                      `https://www.espn.com/${favoriteLeague}`
                    }
                  />
                )}
              </>
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
    <>
      {gameItems?.map((sportGameDay, index) => (
        <List.Section
          key={index}
          title={`${sportGameDay?.title}`}
          subtitle={`${sportGameDay?.games?.length} Game${sportGameDay?.games?.length !== 1 ? "s" : ""}`}
        >
          {sportGameDay?.games}
        </List.Section>
      ))}
    </>
  );
}
