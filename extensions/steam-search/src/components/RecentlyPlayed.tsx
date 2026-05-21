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
  fetchOwnedGames,
  fetchAppIcon,
  getLastPlayed,
  clearRecentlyPlayedCache,
  RecentlyPlayedGame,
} from "../api/steam";
import { GameDetail } from "./GameDetail";
import { formatPlaytime } from "../utils";
import { useGameStats } from "../hooks/useGameStats";
import { useAchievements } from "../hooks/useAchievements";
import { getIconUrl, setIconUrl } from "../cache";

function formatLastPlayed(rtime: number): string {
  const date = new Date(rtime * 1000);
  const now = new Date();
  const toDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((toDay(now) - toDay(date)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const label = `${months[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === now.getFullYear()
    ? label
    : `${label}, ${date.getFullYear()}`;
}

function RecentlyPlayedItem({
  game,
  isSelected,
  ownedGamesReady,
  onRefresh,
}: {
  game: RecentlyPlayedGame;
  isSelected: boolean;
  ownedGamesReady: boolean;
  onRefresh: () => void;
}) {
  const details = useGameStats(game.appid, isSelected);
  const achievements = useAchievements(game.appid, isSelected);
  const fallbackUrl = game.img_icon_url
    ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
    : `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_sm_120.jpg`;
  const [iconUrl, setIconUrlState] = useState<string | null>(
    () => getIconUrl(game.appid) ?? null,
  );
  const [lastPlayedTime, setLastPlayedTime] = useState<number | null>(() =>
    getLastPlayed(game.appid),
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setLastPlayedTime(getLastPlayed(game.appid));
  }, [game.appid, ownedGamesReady]);

  useEffect(() => {
    if (getIconUrl(game.appid)) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchAppIcon(game.appid, controller.signal).then((url) => {
      if (url && !controller.signal.aborted) {
        setIconUrl(game.appid, url);
        setIconUrlState(url);
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
              { text: { value: "·", color: Color.SecondaryText } },
            ]
          : []),
        {
          icon: Icon.GameController,
          text: {
            value: formatPlaytime(game.playtime_forever),
            color: Color.SecondaryText,
          },
          tooltip: "Total playtime",
        },
        ...(lastPlayedTime !== null
          ? [
              { text: { value: "·", color: Color.SecondaryText } },
              {
                icon: Icon.Calendar,
                text: {
                  value: formatLastPlayed(lastPlayedTime),
                  color: Color.SecondaryText,
                },
                tooltip: "Last played",
              },
            ]
          : []),
        ...(game.playtime_2weeks > 0
          ? [
              {
                tag: {
                  value: `${formatPlaytime(game.playtime_2weeks)} lately`,
                  color: Color.Blue,
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
          <Action.Push
            title="View Details"
            icon={Icon.Info}
            target={<GameDetail appId={game.appid} name={game.name} />}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "i" },
              Windows: { modifiers: ["ctrl"], key: "i" },
            }}
          />
          <Action.OpenInBrowser
            title="View on SteamDB"
            url={`https://steamdb.info/app/${game.appid}/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "d" },
              Windows: { modifiers: ["ctrl"], key: "d" },
            }}
          />
          <Action.OpenInBrowser
            title="View on ProtonDB"
            url={`https://www.protondb.com/app/${game.appid}`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "p" },
              Windows: { modifiers: ["ctrl"], key: "p" },
            }}
          />
          {(details?.currentPlayers ||
            details?.peakToday ||
            details?.peakAllTime) && (
            <ActionPanel.Section title="Player Stats">
              {details?.currentPlayers && (
                <Action
                  title={`Current Players: ${details.currentPlayers}`}
                  icon={{ source: Icon.Person, tintColor: Color.Red }}
                  onAction={() =>
                    open(`https://steamcharts.com/app/${game.appid}`)
                  }
                />
              )}
              {details?.peakToday && (
                <Action
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title={`24h Peak: ${details.peakToday}`}
                  icon={Icon.BarChart}
                  onAction={() =>
                    open(`https://steamcharts.com/app/${game.appid}`)
                  }
                />
              )}
              {details?.peakAllTime && (
                <Action
                  title={`All-Time Peak: ${details.peakAllTime}`}
                  icon={Icon.BarChart}
                  onAction={() =>
                    open(`https://steamcharts.com/app/${game.appid}`)
                  }
                />
              )}
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
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "r" },
              Windows: { modifiers: ["ctrl"], key: "r" },
            }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

export function RecentlyPlayed() {
  const { steamApiKey, steamId } = getPreferenceValues<Preferences>();
  const [games, setGames] = useState<RecentlyPlayedGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ownedGamesReady, setOwnedGamesReady] = useState(false);

  const load = (apiKey: string, id: string) => {
    fetchRecentlyPlayed(apiKey, id)
      .then((g) => {
        setGames(g);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    load(steamApiKey ?? "", steamId ?? "");
  }, [steamApiKey, steamId]);

  useEffect(() => {
    fetchOwnedGames(steamApiKey ?? "", steamId ?? "").then(() =>
      setOwnedGamesReady(true),
    );
  }, [steamApiKey, steamId]);

  const refresh = () => {
    clearRecentlyPlayedCache();
    setGames([]);
    setIsLoading(true);
    setOwnedGamesReady(false);
    load(steamApiKey ?? "", steamId ?? "");
  };

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
              ownedGamesReady={ownedGamesReady}
              onRefresh={refresh}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
