import { Action, ActionPanel, Color, Detail, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { fetchRecentGames, LichessApiError } from "./api/lichess";
import { toRecentGameViewModel } from "./lib/formatGame";
import { RecentGameViewModel } from "./types/lichess";

const RECENT_GAME_LIMIT = 15;

interface Preferences {
  lichessUsername: string;
}

export default function Command() {
  const { lichessUsername } = getPreferenceValues<Preferences>();
  const username = lichessUsername.trim();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (lichessUsername: string) => {
      const games = await fetchRecentGames(lichessUsername, RECENT_GAME_LIMIT);
      return games.map((game) => toRecentGameViewModel(game, lichessUsername));
    },
    [username],
    {
      execute: Boolean(username),
      initialData: [],
      keepPreviousData: true,
      failureToastOptions: {
        title: "Could not load recent Lichess games",
      },
    },
  );

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent games by opponent, result, speed, or date" throttle>
      <List.EmptyView
        title={isLoading ? "Loading recent games" : "No Public Games Found"}
        description={
          isLoading
            ? "Fetching the latest public games from Lichess."
            : `${username} has no public games available from the Lichess export endpoint.`
        }
      />
      {(data ?? []).map((game) => (
        <RecentGameItem key={game.id} game={game} />
      ))}
    </List>
  );
}

function RecentGameItem({ game }: { game: RecentGameViewModel }) {
  return (
    <List.Item
      title={`${game.opponent} - ${game.result}`}
      subtitle={`${game.whiteName} (${game.whiteElo}) vs ${game.blackName} (${game.blackElo})`}
      accessories={[{ text: game.speed }, { text: game.date, icon: Icon.Calendar }, { tag: resultTag(game.result) }]}
      actions={<RecentGameActions game={game} />}
    />
  );
}

function RecentGameActions({ game }: { game: RecentGameViewModel }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Game on Lichess" url={game.url} shortcut={Keyboard.Shortcut.Common.Open} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy PGN" content={game.pgn || "PGN unavailable"} />
        <Action.CopyToClipboard title="Copy FEN" content={game.fen || "FEN unavailable"} />
        <Action.CopyToClipboard title="Copy Game URL" content={game.url} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const message =
    error instanceof LichessApiError
      ? error.message
      : "The request failed. Check your network connection and try again.";

  return (
    <Detail
      markdown={`# Could not load games\n\n${message}`}
      actions={
        <ActionPanel>
          <Action
            title="Retry"
            icon={Icon.ArrowClockwise}
            onAction={onRetry}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}

function resultTag(result: RecentGameViewModel["result"]) {
  switch (result) {
    case "win":
      return { value: "Win", color: Color.Green };
    case "loss":
      return { value: "Loss", color: Color.Red };
    case "draw":
      return { value: "Draw", color: Color.SecondaryText };
  }
}
