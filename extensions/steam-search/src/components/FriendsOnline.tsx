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
import { fetchAppIcon } from "../api/steam";
import { getIconUrl, setIconUrl } from "../cache";
import { GameDetail } from "./GameDetail";

export interface FriendSummary {
  steamid: string;
  personaname: string;
  avatarmedium: string;
  personastate: number;
  gameid?: string;
  gameextrainfo?: string;
}

const STATE_LABEL: Record<number, string> = {
  1: "Online",
  2: "Busy",
  3: "Away",
  4: "Away",
  5: "Looking to Trade",
  6: "Looking to Play",
};

const STATE_COLOR: Record<number, Color> = {
  1: Color.Blue,
  2: Color.Orange,
  3: Color.Yellow,
  4: Color.Yellow,
  5: Color.Purple,
  6: Color.Green,
};

let friendsCache: FriendSummary[] | null = null;
let friendsFetchPromise: Promise<FriendSummary[]> | null = null;
let friendsIsPrivate = false;

export function isFriendsListPrivate(): boolean {
  return friendsIsPrivate;
}

export function clearFriendsCache(): void {
  friendsCache = null;
  friendsFetchPromise = null;
  friendsIsPrivate = false;
}

export async function fetchFriendsOnline(
  apiKey: string,
  steamId: string,
): Promise<FriendSummary[]> {
  if (friendsCache !== null) return friendsCache;
  if (friendsFetchPromise !== null) return friendsFetchPromise;

  friendsFetchPromise = (async () => {
    const listRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${apiKey}&steamid=${steamId}&relationship=friend`,
    );
    if (!listRes.ok) {
      friendsIsPrivate = true;
      friendsCache = [];
      return [];
    }
    const listData = (await listRes.json()) as {
      friendslist?: { friends?: { steamid: string }[] };
    };
    const ids = (listData?.friendslist?.friends ?? []).map((f) => f.steamid);
    if (!ids.length) return [];

    const summaries: FriendSummary[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const res = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${ids.slice(i, i + 100).join(",")}`,
      ).catch(() => null);
      if (!res) continue;
      const data = (await res.json()) as {
        response?: { players?: FriendSummary[] };
      };
      summaries.push(...(data?.response?.players ?? []));
    }

    const online = summaries
      .filter((p) => p.personastate > 0)
      .sort((a, b) => a.personaname.localeCompare(b.personaname));

    friendsCache = online;
    return online;
  })().catch(() => {
    friendsFetchPromise = null;
    return [];
  });

  return friendsFetchPromise;
}

function FriendItem({
  friend,
  onRefresh,
}: {
  friend: FriendSummary;
  onRefresh: () => void;
}) {
  const inGame = !!friend.gameid;
  const [gameIcon, setGameIcon] = useState<string | null>(() =>
    friend.gameid ? (getIconUrl(parseInt(friend.gameid, 10)) ?? null) : null,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!friend.gameid || getIconUrl(parseInt(friend.gameid, 10))) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const appId = parseInt(friend.gameid, 10);
    fetchAppIcon(appId, controller.signal).then((url) => {
      if (url && !controller.signal.aborted) {
        setIconUrl(appId, url);
        setGameIcon(url);
      }
    });
    return () => controller.abort();
  }, [friend.gameid]);

  const capsuleFallback = friend.gameid
    ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${friend.gameid}/capsule_sm_120.jpg`
    : null;

  return (
    <List.Item
      id={friend.steamid}
      icon={{ source: friend.avatarmedium }}
      title={friend.personaname}
      accessories={[
        ...(inGame && friend.gameextrainfo
          ? [
              { text: friend.gameextrainfo, tooltip: "Currently playing" },
              {
                icon: {
                  source: gameIcon ?? capsuleFallback ?? Icon.GameController,
                },
                tooltip: "Currently playing",
              },
            ]
          : []),
        inGame
          ? { tag: { value: "In-Game", color: Color.Green } }
          : {
              tag: {
                value: STATE_LABEL[friend.personastate] ?? "Online",
                color: STATE_COLOR[friend.personastate] ?? Color.Blue,
              },
            },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Message"
            icon={Icon.Message}
            onAction={() => open(`steam://friends/message/${friend.steamid}`)}
          />
          {inGame && friend.gameid && (
            <Action
              title="Open Game in Steam"
              icon={Icon.Desktop}
              onAction={() => open(`steam://store/${friend.gameid}`)}
            />
          )}
          {inGame && friend.gameid && (
            <Action.Push
              title="View Game Details"
              icon={Icon.Info}
              target={
                <GameDetail
                  appId={parseInt(friend.gameid, 10)}
                  name={friend.gameextrainfo ?? ""}
                />
              }
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "i" },
                Windows: { modifiers: ["ctrl"], key: "i" },
              }}
            />
          )}
          <Action
            title="View Profile"
            icon={Icon.Person}
            onAction={() => open(`steam://url/SteamIDPage/${friend.steamid}`)}
          />
          {inGame && friend.gameid && (
            <Action.OpenInBrowser
              // eslint-disable-next-line @raycast/prefer-title-case
              title="View Game on SteamDB"
              url={`https://steamdb.info/app/${friend.gameid}/`}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "d" },
                Windows: { modifiers: ["ctrl"], key: "d" },
              }}
            />
          )}
          {inGame && friend.gameid && (
            <Action.OpenInBrowser
              // eslint-disable-next-line @raycast/prefer-title-case
              title="View Game on ProtonDB"
              url={`https://www.protondb.com/app/${friend.gameid}`}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "p" },
                Windows: { modifiers: ["ctrl"], key: "p" },
              }}
            />
          )}
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

export function FriendsOnline() {
  const { steamApiKey, steamId } = getPreferenceValues<Preferences>();
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  const load = (apiKey: string, steamId: string) => {
    fetchFriendsOnline(apiKey, steamId)
      .then((f) => {
        setFriends(f);
        setIsPrivate(isFriendsListPrivate());
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    load(steamApiKey ?? "", steamId ?? "");
  }, [steamApiKey, steamId]);

  const refresh = () => {
    clearFriendsCache();
    setFriends([]);
    setIsPrivate(false);
    setIsLoading(true);
    load(steamApiKey ?? "", steamId ?? "");
  };

  const inGame = friends.filter((f) => f.gameid);
  const online = friends.filter(
    (f) => !f.gameid && f.personastate !== 3 && f.personastate !== 4,
  );
  const away = friends.filter(
    (f) => !f.gameid && (f.personastate === 3 || f.personastate === 4),
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && isPrivate ? (
        <List.EmptyView
          icon={Icon.Lock}
          title="Friends list is private"
          description="Go to Steam → Edit Profile → Privacy Settings and set Friends List to Public"
        />
      ) : !isLoading && friends.length === 0 ? (
        <List.EmptyView
          icon={Icon.TwoPeople}
          title="No friends online"
          description="None of your Steam friends are currently online"
        />
      ) : (
        <>
          {inGame.length > 0 && (
            <List.Section title="In-Game" subtitle={`${inGame.length}`}>
              {inGame.map((f) => (
                <FriendItem key={f.steamid} friend={f} onRefresh={refresh} />
              ))}
            </List.Section>
          )}
          {online.length > 0 && (
            <List.Section title="Online" subtitle={`${online.length}`}>
              {online.map((f) => (
                <FriendItem key={f.steamid} friend={f} onRefresh={refresh} />
              ))}
            </List.Section>
          )}
          {away.length > 0 && (
            <List.Section title="Away" subtitle={`${away.length}`}>
              {away.map((f) => (
                <FriendItem key={f.steamid} friend={f} onRefresh={refresh} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
