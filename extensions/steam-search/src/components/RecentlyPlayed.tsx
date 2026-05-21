import {
  List,
  Icon,
  Color,
  getPreferenceValues,
  open,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  fetchRecentlyPlayed,
  fetchAppIcon,
  RecentlyPlayedGame,
} from "../api/steam";
import { formatPlaytime } from "../utils";
import { useGameStats } from "../hooks/useGameStats";
import { useAchievements } from "../hooks/useAchievements";

function RecentlyPlayedItem({
  game,
  isSelected,
}: {
  game: RecentlyPlayedGame;
  isSelected: boolean;
}) {
  const details = useGameStats(game.appid, isSelected);
  const achievements = useAchievements(game.appid, isSelected);
  const fallbackUrl = game.img_icon_url
    ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
    : `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_sm_120.jpg`;
  const [iconUrl, setIconUrl] = useState<string | null>(
    () => iconCache.get(game.appid) ?? null,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (iconCache.has(game.appid)) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchAppIcon(game.appid, controller.signal).then((url) => {
      if (url && !controller.signal.aborted) {
        iconCache.set(game.appid, url);
        setIconUrl(url);
      }
    });
    return () => controller.abort();
  }, [game.appid]);

  return (
    <List.Item
      id={String(game.appid)}
      icon={{ source: iconUrl ?? fallbackUrl }}
      title={game.name}
      accessories={[
        ...(isSelected
          ? [
              {
                text: {
                  value: details
                    ? details.peakToday
                      ? `${details.currentPlayers} ⬆ ${details.peakToday}`
                      : (details.currentPlayers ?? "…")
                    : "…",
                  color: Color.SecondaryText,
                },
                tooltip: "Current players / 24h peak",
              },
              {
                text: {
                  value: details?.rating ?? "…",
                  color: details?.ratingColor ?? Color.SecondaryText,
                },
                tooltip: "Review score",
              },
              ...(achievements
                ? [
                    {
                      text: {
                        value: `🏆 ${achievements.unlocked}/${achievements.total}`,
                        color:
                          achievements.unlocked === achievements.total
                            ? Color.Yellow
                            : Color.SecondaryText,
                      },
                      tooltip: "Achievements",
                    },
                  ]
                : []),
            ]
          : []),
        {
          text: {
            value: formatPlaytime(game.playtime_forever),
            color: Color.SecondaryText,
          },
          tooltip: "Total playtime",
        },
        ...(game.playtime_2weeks > 0
          ? [
              {
                tag: {
                  value: `${formatPlaytime(game.playtime_2weeks)} lately`,
                  color: Color.Green,
                },
                tooltip: "Playtime in the last 2 weeks",
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Open in Steam"
            icon={Icon.Desktop}
            onAction={() => open(`steam://nav/games/details/${game.appid}`)}
          />
          <Action.OpenInBrowser
            // eslint-disable-next-line @raycast/prefer-title-case
            title="View on SteamDB"
            url={`https://steamdb.info/app/${game.appid}/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "d" },
              Windows: { modifiers: ["ctrl"], key: "d" },
            }}
          />
          {details?.peakAllTime && (
            <ActionPanel.Section title="Player Stats">
              <Action
                // eslint-disable-next-line @raycast/prefer-title-case
                title={`All-Time Peak: ${details.peakAllTime}`}
                icon={Icon.BarChart}
                onAction={() =>
                  open(`https://steamcharts.com/app/${game.appid}`)
                }
              />
            </ActionPanel.Section>
          )}
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={`https://store.steampowered.com/app/${game.appid}`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "c" },
              Windows: { modifiers: ["ctrl"], key: "c" },
            }}
          />
        </ActionPanel>
      }
    />
  );
}

const iconCache = new Map<number, string>();

export function RecentlyPlayed() {
  const { steamApiKey, steamId } = getPreferenceValues<Preferences>();
  const [games, setGames] = useState<RecentlyPlayedGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentlyPlayed(steamApiKey ?? "", steamId ?? "")
      .then((g) => {
        setGames(g);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [steamApiKey, steamId]);

  return (
    <List isLoading={isLoading} onSelectionChange={setSelectedId}>
      {!isLoading && games.length === 0 ? (
        <List.EmptyView
          icon={Icon.GameController}
          title="No recently played games"
          description="Play a game on Steam to see it here"
        />
      ) : (
        <List.Section
          title="Recently Played"
          subtitle={`${games.length} games`}
        >
          {games.map((game) => (
            <RecentlyPlayedItem
              key={game.appid}
              game={game}
              isSelected={selectedId === String(game.appid)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
