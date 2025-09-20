import { Detail, List, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";

const favoriteTeam = getPreferenceValues().team as string;
const favoriteLeague = getPreferenceValues().league as string;
const favoriteSport = getPreferenceValues().sport as string;

interface Athlete {
  shortName: string;
}

interface Competitor {
  athlete: Athlete;
  team: {
    logos: { [key: string]: string }[];
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

export default function CompletedGames() {
  // Fetch NHL Stats

  const {
    isLoading: completedLoading,
    data: completedData,
    revalidate: completeRevalidate,
  } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/${favoriteSport}/${favoriteLeague}/teams/${favoriteTeam}/schedule`,
  );

  if (completedLoading) {
    return <Detail isLoading={true} />;
  }

  const gameItems: DayItems[] = [];
  const games = completedData?.events || [];

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

    let accessoryTitle = `${game?.competitions?.[0]?.competitors?.[1]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[1]?.score?.displayValue} - ${game?.competitions?.[0]?.competitors?.[0]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[0]?.score?.displayValue}`;
    let accessoryColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
    let accessoryToolTip = "Final";

    if (game?.status?.type?.state === "post") {
      accessoryTitle = `${game?.competitions?.[0]?.competitors?.[1]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[1]?.score} - ${game?.competitions?.[0]?.competitors?.[0]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[0]?.score}`;
      accessoryColor = Color.SecondaryText;
      accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
      accessoryToolTip = "Final";
    }

    if (
      game?.competitions[0]?.status?.type?.state === "post" &&
      game?.competitions[0]?.status?.type?.completed === false
    ) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    let gameTitle = game?.name ?? "Unknown";

    if (favoriteSport === "hockey") {
      gameTitle = game?.name?.replace(" at ", " vs ");
    }

    if (game?.competitions?.[0]?.status?.type?.completed === true)
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
                onAction={completeRevalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />

              <Action.OpenInBrowser
                title="View Game Details on ESPN"
                url={`${game?.links?.[0]?.href ?? `https://www.espn.com/${favoriteLeague}`}`}
              />

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
            </ActionPanel>
          }
        />,
      );
  });

  gameItems.reverse();

  const subTitleText = "Game";

  if (completedLoading) {
    return <Detail isLoading={true} />;
  }

  if (!completedData || games.length === 0) {
    return <List.EmptyView icon="Empty.png" title="No Results Found" />;
  }

  return (
    <>
      {gameItems?.map((sportGameDay, index) => (
        <List.Section
          key={index}
          title={sportGameDay?.title ?? "Unknown"}
          subtitle={`${sportGameDay?.games?.length} ${subTitleText} ${sportGameDay?.games?.length !== 1 ? "s" : ""}`}
        >
          {sportGameDay?.games}
        </List.Section>
      ))}
    </>
  );
}
