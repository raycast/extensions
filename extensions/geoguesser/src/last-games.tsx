import { List, ActionPanel, Action, Icon, Color, Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getRecentGames, getGameDetails, getChallengeDetails, getDuelDetails } from "./api/client";
import {
  FeedEntry,
  DailyChallengePayload,
  StreakPayload,
  DuelPayload,
  DuelDetails,
  GameDetails,
  GameGuess,
  GameRound,
} from "./types";
import { formatNumber, getPlonkItUrl, getUserCountryCode } from "./utils";

interface ParsedGame {
  type: "daily" | "streak" | "duel" | "unknown";
  time: string;
  title: string;
  subtitle: string;
  url: string;
  token: string;
  points?: number;
  icon: string;
  iconTint: Color;
}

export default function LastGamesCommand() {
  const [games, setGames] = useState<ParsedGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGames() {
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Loading games...",
        });

        const feed = await getRecentGames(25);
        const parsedGames = feed.entries
          .map((entry) => parseGameEntry(entry))
          .filter((game): game is ParsedGame => game !== null);
        setGames(parsedGames);

        showToast({
          style: Toast.Style.Success,
          title: `Loaded ${parsedGames.length} games`,
        });
      } catch (error) {
        console.error("Failed to fetch games:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load games",
          message: error instanceof Error ? error.message : "Please check your authentication",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchGames();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search games...">
      {games.map((game, idx) => (
        <List.Item
          key={`${game.time}-${idx}`}
          title={game.title}
          subtitle={game.subtitle}
          icon={{ source: game.icon, tintColor: game.iconTint }}
          accessories={[
            game.points !== undefined ? { text: `${formatNumber(game.points)} pts` } : {},
            { date: new Date(game.time) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View Game Details" target={<GameDetailView game={game} />} icon={Icon.Eye} />
              <Action.OpenInBrowser title="Open in Browser" url={game.url} />
              <Action.CopyToClipboard title="Copy Game Link" content={game.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function GameDetailView({ game }: { game: ParsedGame }) {
  const [details, setDetails] = useState<GameDetails | DuelDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Loading game details...",
        });

        let data;
        if (game.type === "duel") {
          data = await getDuelDetails(game.token);
        } else if (game.type === "daily" || game.type === "unknown") {
          try {
            data = await getChallengeDetails(game.token);
          } catch {
            data = await getGameDetails(game.token);
          }
        } else {
          data = await getGameDetails(game.token);
        }

        setDetails(data);

        showToast({
          style: Toast.Style.Success,
          title: "Game details loaded",
        });
      } catch (err) {
        console.error("Failed to fetch game details:", err);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load game details",
          message: err instanceof Error ? err.message : "Could not retrieve game information",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetails();
  }, [game.token, game.type]);

  if (error) {
    return <Detail markdown={`# ❌ Error\n\n${error}`} />;
  }

  if (!details) {
    return <Detail isLoading={isLoading} markdown="# Loading game details..." />;
  }

  // Check type early and render appropriate view
  if (game.type === "duel" && "teams" in details) {
    return <DuelDetailView game={game} details={details as DuelDetails} />;
  }

  // Regular game details - cast to GameDetails
  const gameDetails = details as GameDetails;
  const totalScore = gameDetails.player?.totalScore?.amount || game.points || 0;
  const guesses = gameDetails.player?.guesses || [];
  const rounds = gameDetails.rounds || [];

  const markdown = `
# ${game.title}

**${gameDetails.mapName || gameDetails.map?.name || "Unknown Map"}**

---

## 🎯 Final Score
**${formatNumber(totalScore)} points**

## 📍 Rounds

${rounds
  .map((round: GameRound, idx: number) => {
    const guess = guesses[idx];
    if (!guess) return `### Round ${idx + 1}\nNo guess data`;

    const distance = guess.distance?.amount
      ? guess.distance.amount > 1000
        ? `${Math.round(guess.distance.amount / 1000)} km`
        : `${Math.round(guess.distance.amount)} m`
      : "—";

    return `### Round ${idx + 1}
- **Score:** ${formatNumber(guess.roundScore?.amount || 0)} pts
- **Distance:** ${distance}
- **Time:** ${guess.time}s
- **Location:** [${round.lat.toFixed(4)}, ${round.lng.toFixed(4)}](https://www.google.com/maps?q=${round.lat},${round.lng})
- **Your Guess:** [${guess.lat.toFixed(4)}, ${guess.lng.toFixed(4)}](https://www.google.com/maps?q=${guess.lat},${guess.lng})`;
  })
  .join("\n\n")}
  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Total Score" text={`${formatNumber(totalScore)} pts`} icon="🎯" />
          {guesses.map((guess: GameGuess, idx: number) => (
            <Detail.Metadata.Label
              key={idx}
              title={`Round ${idx + 1}`}
              text={`${formatNumber(guess.roundScore?.amount || 0)} pts`}
            />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Game">
            <Action.OpenInBrowser title="Open in Browser" url={game.url} />
          </ActionPanel.Section>

          {rounds.some((r) => r.countryCode) && (
            <ActionPanel.Section title="Practice on Plonk It">
              {rounds.map((round, idx) => {
                if (!round.countryCode) return null;
                const plonkItUrl = getPlonkItUrl(round.countryCode);
                if (!plonkItUrl) return null;

                const validKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
                const shortcutKey = idx < 9 ? validKeys[idx] : undefined;

                return (
                  <Action.OpenInBrowser
                    key={idx}
                    title={`Round ${idx + 1}: ${round.countryCode.toUpperCase()}`}
                    url={plonkItUrl}
                    icon={Icon.Globe}
                    shortcut={shortcutKey ? { modifiers: ["cmd"], key: shortcutKey } : undefined}
                  />
                );
              })}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

function DuelDetailView({ game, details }: { game: ParsedGame; details: DuelDetails }) {
  const userCountryCode = getUserCountryCode();
  const myTeam = details.teams.find((team) => team.players.some((player) => player.countryCode === userCountryCode));
  const enemyTeam = details.teams.find((team) => team.id !== myTeam?.id);

  const didWin = details.result.winningTeamId === myTeam?.id;
  const isDraw = details.result.isDraw;

  const markdown = `
# ⚔️ Duel ${isDraw ? "DRAW" : didWin ? "VICTORY!" : "DEFEAT"}

**${details.options.map.name}**

---

## 📊 Final Result

${didWin ? "🏆 **YOU WON!**" : isDraw ? "🤝 **DRAW!**" : "💀 **YOU LOST**"}

### Team ${myTeam?.name.toUpperCase()}  ${didWin ? "🏆" : ""}
- **Health:** ${myTeam?.health || 0} / ${details.options.initialHealth}
- **Players:** ${myTeam?.players.length || 0}
- **Multiplier:** ${myTeam?.currentMultiplier}x

### Team ${enemyTeam?.name.toUpperCase()}
- **Health:** ${enemyTeam?.health || 0} / ${details.options.initialHealth}
- **Players:** ${enemyTeam?.players.length || 0}
- **Multiplier:** ${enemyTeam?.currentMultiplier}x

---

## 📍 Round Results

${myTeam?.roundResults
  .map((round) => {
    const location = details.rounds.find((r) => r.roundNumber === round.roundNumber);
    const distance =
      round.bestGuess.distance > 1000
        ? `${Math.round(round.bestGuess.distance / 1000)} km`
        : `${Math.round(round.bestGuess.distance)} m`;

    return `### Round ${round.roundNumber} ${location?.panorama.countryCode.toUpperCase() || ""}
- **Score:** ${formatNumber(round.score)} pts
- **Distance:** ${distance}
- **Damage Dealt:** ${round.damageDealt}
- **Multiplier:** ${round.multiplier}x
- **Health:** ${round.healthBefore} → ${round.healthAfter}
- **Location:** [${location?.panorama.lat.toFixed(4)}, ${location?.panorama.lng.toFixed(4)}](https://www.google.com/maps?q=${location?.panorama.lat},${location?.panorama.lng})`;
  })
  .join("\n\n")}

---

## ⚙️ Game Settings
- **Mode:** ${details.options.competitiveGameMode || "Team Duels"}
- **Round Time:** ${details.options.roundTime}s
- **Moving:** ${details.movementOptions.forbidMoving ? "❌" : "✅"}
- **Zooming:** ${details.movementOptions.forbidZooming ? "❌" : "✅"}
- **Rotating:** ${details.movementOptions.forbidRotating ? "❌" : "✅"}
  `;

  const myPlayer = myTeam?.players[0];
  const ratingChange = myPlayer?.progressChange?.rankedTeamDuelsProgress;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Result"
            text={isDraw ? "Draw" : didWin ? "Victory" : "Defeat"}
            icon={isDraw ? "🤝" : didWin ? "🏆" : "💀"}
          />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Your Team" text={myTeam?.name.toUpperCase() || "—"} icon="👥" />
          <Detail.Metadata.Label
            title="Health"
            text={`${myTeam?.health || 0} / ${details.options.initialHealth}`}
            icon="❤️"
          />
          <Detail.Metadata.Label title="Multiplier" text={`${myTeam?.currentMultiplier || 1}x`} icon="⚡" />

          <Detail.Metadata.Separator />

          {ratingChange && (
            <>
              <Detail.Metadata.Label
                title="Rating Change"
                text={`${ratingChange.ratingBefore} → ${ratingChange.ratingAfter} (${ratingChange.ratingAfter >= ratingChange.ratingBefore ? "+" : ""}${ratingChange.ratingAfter - ratingChange.ratingBefore})`}
                icon="📈"
              />
              <Detail.Metadata.Label title="Win Streak" text={`${ratingChange.winStreak}`} icon="🔥" />
              <Detail.Metadata.Separator />
            </>
          )}

          <Detail.Metadata.Label title="Rounds" text={`${details.currentRoundNumber}`} icon="📍" />
          <Detail.Metadata.Label title="Map" text={details.options.map.name} icon="🗺️" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Game">
            <Action.OpenInBrowser title="Open in Browser" url={game.url} />
            <Action.CopyToClipboard title="Copy Game ID" content={game.token} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Practice on Plonk It">
            {details.rounds.map((round) => {
              const plonkItUrl = getPlonkItUrl(round.panorama.countryCode);
              if (!plonkItUrl) return null;

              const validKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
              const shortcutKey = round.roundNumber <= 9 ? validKeys[round.roundNumber - 1] : undefined;

              return (
                <Action.OpenInBrowser
                  key={round.roundNumber}
                  title={`Round ${round.roundNumber}: ${round.panorama.countryCode.toUpperCase()}`}
                  url={plonkItUrl}
                  icon={Icon.Globe}
                  shortcut={shortcutKey ? { modifiers: ["cmd"], key: shortcutKey } : undefined}
                />
              );
            })}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function parseGameEntry(entry: FeedEntry): ParsedGame | null {
  try {
    // Type 2: Daily Challenge / Standard Game
    if (entry.type === 2) {
      const payload: DailyChallengePayload = JSON.parse(entry.payload);
      return {
        type: "daily",
        time: entry.time,
        title: payload.isDailyChallenge ? "📅 Daily Challenge" : `🎮 ${payload.gameMode}`,
        subtitle: `${payload.mapName} • ${formatNumber(payload.points)} pts`,
        url: `https://www.geoguessr.com/challenge/${payload.challengeToken}`,
        token: payload.challengeToken,
        points: payload.points,
        icon: Icon.Star,
        iconTint: payload.isDailyChallenge ? Color.Yellow : Color.Blue,
      };
    }

    // Type 7: Streak Games (array of games)
    if (entry.type === 7) {
      const streakGames: StreakPayload[] = JSON.parse(entry.payload);
      const totalPoints = streakGames.reduce((sum, game) => sum + game.payload.points, 0);
      const bestStreak = Math.max(...streakGames.map((game) => game.payload.points));
      const firstGame = streakGames[0]?.payload;

      return {
        type: "streak",
        time: entry.time,
        title: "🔥 Country Streak Session",
        subtitle: `${streakGames.length} games • Best: ${bestStreak}`,
        url: `https://www.geoguessr.com/game/${firstGame?.gameToken || ""}`,
        token: firstGame?.gameToken || "",
        points: totalPoints,
        icon: Icon.BarChart,
        iconTint: Color.Orange,
      };
    }

    // Type 6: Duels
    if (entry.type === 6) {
      const payload: DuelPayload = JSON.parse(entry.payload);
      return {
        type: "duel",
        time: entry.time,
        title: "⚔️ Duel",
        subtitle: payload.competitiveGameMode || payload.gameMode,
        url: `https://game-server.geoguessr.com/api/duels/${payload.gameId}`,
        token: payload.gameId,
        icon: Icon.TwoPeople,
        iconTint: Color.Purple,
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to parse game entry:", error);
    return null;
  }
}
