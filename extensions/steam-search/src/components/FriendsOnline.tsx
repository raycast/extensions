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

interface FriendSummary {
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
  4: "Snooze",
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

const gameIconCache = new Map<string, string>();

let friendsCache: FriendSummary[] | null = null;
let friendsFetchPromise: Promise<FriendSummary[]> | null = null;

async function fetchFriendsOnline(
  apiKey: string,
  steamId: string,
): Promise<FriendSummary[]> {
  if (friendsCache !== null) return friendsCache;
  if (friendsFetchPromise !== null) return friendsFetchPromise;

  friendsFetchPromise = (async () => {
    const listRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${apiKey}&steamid=${steamId}&relationship=friend`,
    );
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

function FriendItem({ friend }: { friend: FriendSummary }) {
  const inGame = !!friend.gameid;
  const [gameIcon, setGameIcon] = useState<string | null>(
    friend.gameid ? (gameIconCache.get(friend.gameid) ?? null) : null,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!friend.gameid || gameIconCache.has(friend.gameid)) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchAppIcon(parseInt(friend.gameid, 10), controller.signal).then((url) => {
      if (url && !controller.signal.aborted) {
        gameIconCache.set(friend.gameid!, url);
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
              { icon: { source: gameIcon ?? capsuleFallback ?? Icon.GameController }, tooltip: "Currently playing" },
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
        </ActionPanel>
      }
    />
  );
}

// Set to true to use mock data for screenshots, revert before pushing
const MOCK = false;

const MOCK_FRIENDS: FriendSummary[] = [
  { steamid: "1", personaname: "Kolbeinn",      avatarmedium: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg", personastate: 1, gameid: "730",     gameextrainfo: "Counter-Strike 2" },
  { steamid: "2", personaname: "SpeedrunGod",   avatarmedium: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg", personastate: 1, gameid: "1245620", gameextrainfo: "ELDEN RING" },
  { steamid: "3", personaname: "xXDarkHunterXx",avatarmedium: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg", personastate: 1, gameid: "1086940", gameextrainfo: "Baldur's Gate 3" },
  { steamid: "4", personaname: "TechWizard99",  avatarmedium: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg", personastate: 1 },
  { steamid: "5", personaname: "CasualGamer",   avatarmedium: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg", personastate: 2 },
  { steamid: "6", personaname: "NightOwl_EU",   avatarmedium: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg", personastate: 3 },
  { steamid: "7", personaname: "ArcticFox",     avatarmedium: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg", personastate: 4 },
];

export function FriendsOnline() {
  const { steamApiKey, steamId } = getPreferenceValues<{
    steamApiKey: string;
    steamId: string;
  }>();
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (MOCK) {
      setFriends(MOCK_FRIENDS);
      setIsLoading(false);
      return;
    }
    fetchFriendsOnline(steamApiKey, steamId)
      .then((f) => {
        setFriends(f);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [steamApiKey, steamId]);

  const inGame = friends.filter((f) => f.gameid);
  const online = friends.filter((f) => !f.gameid && f.personastate !== 3 && f.personastate !== 4);
  const away = friends.filter((f) => !f.gameid && (f.personastate === 3 || f.personastate === 4));

  return (
    <List isLoading={isLoading}>
      {!isLoading && friends.length === 0 ? (
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
                <FriendItem key={f.steamid} friend={f} />
              ))}
            </List.Section>
          )}
          {online.length > 0 && (
            <List.Section title="Online" subtitle={`${online.length}`}>
              {online.map((f) => (
                <FriendItem key={f.steamid} friend={f} />
              ))}
            </List.Section>
          )}
          {away.length > 0 && (
            <List.Section title="Away" subtitle={`${away.length}`}>
              {away.map((f) => (
                <FriendItem key={f.steamid} friend={f} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
