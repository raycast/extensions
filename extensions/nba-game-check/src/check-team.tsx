import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchTeamGames, Game } from "./api";
import { resolveTeam, NBATeam } from "./teams";
import {
  formatMatchup,
  formatFullMatchup,
  formatGameDate,
  formatGameTime,
  formatScoreWithResult,
  getResultIcon,
  getGameStatusText,
  getNBAScheduleUrl,
  isToday,
} from "./utils";

// ─── Arguments ───────────────────────────────────────────────────────────────

interface Arguments {
  team: string;
}

// ─── Main Command ────────────────────────────────────────────────────────────

export default function Command(
  props: LaunchProps<{ arguments: Arguments }>
) {
  const { team: teamInput } = props.arguments;
  const resolvedTeam = resolveTeam(teamInput);

  if (!resolvedTeam) {
    showToast({
      style: Toast.Style.Failure,
      title: "Team not found",
      message: `Couldn't match "${teamInput}" to an NBA team. Try a name like "Knicks" or abbreviation like "NYK".`,
    });

    return (
      <List>
        <List.EmptyView
          icon={Icon.QuestionMarkCircle}
          title="Team not found"
          description={`Couldn't match "${teamInput}" to an NBA team.\nTry a team name (Knicks), city (New York), or abbreviation (NYK).`}
        />
      </List>
    );
  }

  return <TeamGamesList team={resolvedTeam} />;
}

// ─── Team Games List ─────────────────────────────────────────────────────────

function TeamGamesList({ team }: { team: NBATeam }) {
  const {
    data,
    isLoading,
    revalidate,
    error,
  } = useCachedPromise(fetchTeamGames, [team.id], {
    keepPreviousData: true,
  });

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load games",
      message: error.message,
    });
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${team.fullName}`}
      searchBarPlaceholder="Filter games..."
    >
      {/* Today Banner */}
      {data?.todayGame ? (
        <List.Section title="🏀 Game Today!" subtitle={team.fullName}>
          <TodayGameItem game={data.todayGame} teamId={team.id} />
        </List.Section>
      ) : (
        <List.Section title={team.fullName} subtitle="No game today" />
      )}

      {/* Recent Results */}
      <List.Section title="Recent results" subtitle="Last 3 games">
        {data?.recentGames.map((game) => (
          <RecentGameItem
            key={game.id}
            game={game}
            teamId={team.id}
          />
        ))}
        {!isLoading && data?.recentGames.length === 0 && (
          <List.Item
            icon={Icon.Minus}
            title="No recent games found"
            subtitle="Check back during the season"
          />
        )}
      </List.Section>

      {/* Upcoming Schedule */}
      <List.Section title="Upcoming games" subtitle="Next 3 games">
        {data?.upcomingGames
          .filter((g) => !isToday(g.date)) // don't duplicate today's game
          .map((game) => (
            <UpcomingGameItem
              key={game.id}
              game={game}
              teamId={team.id}
            />
          ))}
        {!isLoading && data?.upcomingGames.length === 0 && (
          <List.Item
            icon={Icon.Minus}
            title="No upcoming games scheduled"
            subtitle="Check back later"
          />
        )}
      </List.Section>

      {/* Footer actions available everywhere */}
      <List.Section title="">
        <List.Item
          icon={Icon.Globe}
          title="View full schedule on NBA.com"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open NBA.com Schedule"
                url={getNBAScheduleUrl(team.abbreviation)}
              />
              <Action
                title="Refresh Games"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ─── List Items ──────────────────────────────────────────────────────────────

function TodayGameItem({
  game,
  teamId,
}: {
  game: Game;
  teamId: number;
}) {
  const matchup = formatFullMatchup(game);
  const statusText = getGameStatusText(game);
  const isLive =
    game.status.includes("Qtr") ||
    game.status === "Halftime" ||
    game.status.includes("OT");
  const isFinal = game.status === "Final";

  const accessories: List.Item.Accessory[] = [];

  if (isLive) {
    accessories.push({
      tag: { value: "🔴 LIVE", color: Color.Red },
    });
    accessories.push({
      text: `${game.visitor_team_score} - ${game.home_team_score}`,
    });
  } else if (isFinal) {
    accessories.push({
      tag: { value: "FINAL", color: Color.Yellow },
    });
    accessories.push({
      text: formatScoreWithResult(game, teamId),
    });
  } else {
    accessories.push({
      tag: { value: "⭐ TODAY", color: Color.Yellow },
    });
    accessories.push({ text: statusText });
  }

  return (
    <List.Item
      icon={{ source: Icon.Star, tintColor: Color.Yellow }}
      title={matchup}
      subtitle={statusText}
      accessories={accessories}
      actions={
        <GameActionPanel game={game} teamId={teamId} />
      }
    />
  );
}

function RecentGameItem({
  game,
  teamId,
}: {
  game: Game;
  teamId: number;
}) {
  const matchup = formatMatchup(game, teamId);
  const dateStr = formatGameDate(game.date);
  const scoreStr = formatScoreWithResult(game, teamId);

  return (
    <List.Item
      icon={getResultIcon(game, teamId)}
      title={matchup}
      subtitle={dateStr}
      accessories={[{ text: scoreStr }]}
      actions={
        <GameActionPanel game={game} teamId={teamId} />
      }
    />
  );
}

function UpcomingGameItem({
  game,
  teamId,
}: {
  game: Game;
  teamId: number;
}) {
  const matchup = formatMatchup(game, teamId);
  const dateStr = formatGameDate(game.date);
  const timeStr = formatGameTime(game.datetime);

  const accessories: List.Item.Accessory[] = [
    { text: timeStr },
  ];

  if (isToday(game.date)) {
    accessories.unshift({
      tag: { value: "TODAY", color: Color.Orange },
    });
  }

  return (
    <List.Item
      icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
      title={matchup}
      subtitle={dateStr}
      accessories={accessories}
      actions={
        <GameActionPanel game={game} teamId={teamId} />
      }
    />
  );
}

// ─── Action Panel ────────────────────────────────────────────────────────────

function GameActionPanel({
  game,
  teamId,
}: {
  game: Game;
  teamId: number;
}) {
  const isFinal = game.status === "Final";

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title="View on NBA.com"
          url={`https://www.nba.com/game/${game.visitor_team.abbreviation.toLowerCase()}-vs-${game.home_team.abbreviation.toLowerCase()}`}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {isFinal && (
          <Action.CopyToClipboard
            title="Copy Score"
            content={`${formatFullMatchup(game)}: ${formatScoreWithResult(game, teamId)}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        )}
        <Action.CopyToClipboard
          title="Copy Matchup"
          content={formatFullMatchup(game)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
