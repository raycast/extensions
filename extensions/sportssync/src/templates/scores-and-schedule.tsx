import { Detail, List, Color, Icon, Action, ActionPanel } from "@raycast/api";
import getScoresAndSchedule from "../utils/getSchedule";
import sportInfo from "../utils/getSportInfo";
import getCountryCode from "../utils/getF1RaceFlag";
import Plays from "../views/playbyplay";
import Baseball from "../views/boxscore/baseball";
import Basketball from "../views/boxscore/basketball";
import Football from "../views/boxscore/football";
import Hockey from "../views/boxscore/hockey";
import TeamDetail from "../views/teamDetail";

interface DayItems {
  title: string;
  games: JSX.Element[];
}

export default function DisplayScoresAndSchedule() {
  const { scheduleLoading, scheduleData, scheduleRevalidate } = getScoresAndSchedule();
  const currentLeague = sportInfo.getLeague();
  const currentSport = sportInfo.getSport();

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

    if (currentSport === "racing") {
      period = "L";
    }

    const startingSoonInterval = 15 * 60 * 1000;
    const currentDate = new Date();
    const timeUntilGameStarts = gameDate.getTime() - currentDate.getTime();

    if (timeUntilGameStarts <= startingSoonInterval && game?.status?.type?.state === "pre") {
      accessoryColor = Color.Yellow;
      accessoryIcon = { source: Icon.Warning, tintColor: Color.Yellow };
      accessoryToolTip = "Starting Soon";
    }

    if (currentLeague !== "f1") {
      if (game?.status?.type?.state === "in") {
        accessoryTitle = `${game?.competitions[0]?.competitors[1]?.team.abbreviation} ${game?.competitions[0]?.competitors[1]?.score} - ${game?.competitions[0]?.competitors[0]?.team?.abbreviation} ${game?.competitions[0]?.competitors[0]?.score}     ${period}${periodNumber} ${timeDisplay}`;
        accessoryColor = Color.Green;
        accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
        accessoryToolTip = "In Progress";
      } else {
        if (game.status.type.state === "in") {
          accessoryTitle = `${game.competitions[4].competitors[0].athlete.shortName}     L${game.competitions[4].status.period} ${game.status.displayClock}`;
          accessoryColor = Color.Green;
          accessoryIcon = { source: Icon.Livestream, tintColor: Color.Green };
          accessoryToolTip = "Current Leader & Lap";
        }
      }
    }

    if (currentLeague !== "f1") {
      if (game?.status?.type?.state === "post") {
        accessoryTitle = `${game?.competitions[0]?.competitors[1]?.team?.abbreviation} ${game?.competitions[0]?.competitors[1]?.score} - ${game?.competitions[0]?.competitors[0]?.team?.abbreviation} ${game?.competitions[0]?.competitors[0]?.score}`;
        accessoryColor = Color.SecondaryText;
        accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
        accessoryToolTip = "Final";
      }
    } else {
      if (
        game?.competitions[4]?.type?.abbreviation === "Race" &&
        game?.competitions[4]?.status?.type?.completed === true
      ) {
        accessoryTitle = `${game?.competitions?.[4]?.competitors[0]?.athlete?.shortName}`;
        accessoryColor = Color.SecondaryText;
        accessoryIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
        accessoryToolTip = "Winner";
      }
    }

    if (game?.status?.type?.state === "post" && game?.status?.type?.completed === false) {
      accessoryTitle = `Postponed`;
      accessoryIcon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
      accessoryColor = Color.Orange;
    }

    let gameTitle = game?.name ?? "Unknown";
    let subtitle;

    if (currentSport === "hockey") {
      gameTitle = game?.name?.replace(" at ", " vs ");
    }

    if (currentLeague === "f1") {
      subtitle = `${game?.circuit?.address?.city}, ${game?.circuit?.address?.country}`;
    }

    const raceLocation = `${game?.circuit?.address?.country ?? "Unknown"}`;

    sportGameDay?.games.push(
      <List.Item
        key={index}
        title={gameTitle}
        subtitle={subtitle}
        icon={{
          source:
            game?.competitions?.[0]?.competitors?.[1]?.team?.logo ??
            (currentLeague === "f1"
              ? `https://a.espncdn.com/combiner/i?img=/i/teamlogos/countries/500/${getCountryCode(raceLocation)}.png&scale=crop&cquality=40&location=origin&w=80&h=80`
              : `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${currentLeague}.png&w=100&h=100&transparent=true`),
        }}
        accessories={
          currentLeague !== "f1"
            ? [
                {
                  text: { value: `${accessoryTitle ?? "No Date Found"}`, color: accessoryColor },
                  tooltip: accessoryToolTip ?? "Unknown",
                },
                { icon: accessoryIcon },
              ]
            : [
                { tag: { value: (index + 1).toString(), color: Color.Green }, icon: Icon.Flag, tooltip: "Race #" },
                {
                  text: { value: `${accessoryTitle}`, color: accessoryColor },
                  tooltip: accessoryToolTip,
                },
                { icon: accessoryIcon },
              ]
        }
        actions={
          <ActionPanel>
            {currentLeague === "mlb" && currentSport === "baseball" && game?.status?.type?.state === "in" && (
              <Action.Push title="View Box Score" icon={Icon.Building} target={<Baseball gameId={game.id} />} />
            )}

            {currentSport === "basketball" && game?.status?.type?.state === "in" && (
              <Action.Push title="View Box Score" icon={Icon.Building} target={<Basketball gameId={game.id} />} />
            )}

            {currentSport === "football" && game?.status?.type?.state === "in" && (
              <Action.Push title="View Box Score" icon={Icon.Building} target={<Football gameId={game.id} />} />
            )}

            {currentLeague === "nhl" && currentSport === "hockey" && game?.status?.type?.state === "in" && (
              <Action.Push title="View Box Score" icon={Icon.Building} target={<Hockey gameId={game.id} />} />
            )}

            {currentLeague !== "f1" &&
              currentSport !== "soccer" &&
              game?.competitions?.[0]?.status?.type?.state === "in" && (
                <Action.Push title="View Play by Play" icon={Icon.Stopwatch} target={<Plays gameId={game.id} />} />
              )}

            {currentLeague !== "f1" &&
              currentSport !== "soccer" &&
              game?.competitions?.[0]?.status?.type?.state === "post" && (
                <>
                  <Action.Push title="View Play by Play" icon={Icon.Stopwatch} target={<Plays gameId={game.id} />} />
                </>
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

  gameItems.sort((a, b) => {
    const dateA = new Date(a.title);
    const dateB = new Date(b.title);
    return dateA.getTime() - dateB.getTime();
  });

  let subTitleText = "Game";

  if (currentSport === "racing") {
    subTitleText = "Race";
  }

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
          title={`${sportGameDay?.title ?? "Unknown"}`}
          subtitle={`${sportGameDay?.games?.length} ${subTitleText}${sportGameDay?.games?.length !== 1 ? "s" : ""}`}
        >
          {sportGameDay?.games}
        </List.Section>
      ))}
    </>
  );
}
