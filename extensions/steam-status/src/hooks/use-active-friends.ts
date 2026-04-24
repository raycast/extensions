import { useFetch } from "@raycast/utils";
import { useMemo } from "react";

export interface IFriend {
  steamid: string;
  relationship: string;
  friend_since: number;
}

export interface IFriendStatus {
  steamid: string;
  communityvisibilitystate: number;
  profilestate: number;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  avatarhash: string;
  lastlogoff: number;
  personastate: number;
  realname: string;
  primaryclanid: string;
  timecreated: number;
  personastateflags: number;
  gameextrainfo: string;
  gameid: string;
  loccountrycode: string;
}

export interface IExtensionPreferences {
  steamId: string;
  steamApiKey: string;
}

const useActiveFriends = (steamId?: string, steamApiKey?: string) => {
  const { isLoading, data: friends } = useFetch<{ friendslist: { friends: IFriend[] } }>(
    `https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${steamApiKey}&steamid=${steamId}&relationship=friend`,
    {
      execute: !!steamId && !!steamApiKey,
    },
  );

  const friendIds = useMemo(() => {
    if (friends) {
      return friends.friendslist.friends.map(({ steamid }) => steamid);
    }
  }, [friends]);

  const { isLoading: isStatusLoading, data } = useFetch<
    { response: { players: IFriendStatus[] } },
    undefined,
    IFriendStatus[]
  >(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${friendIds}`, {
    execute: !!friendIds?.length,
    mapResult: (data) => {
      const activeFriends = data.response.players
        .filter(({ gameid }) => !!gameid)
        .sort((a, b) => a.timecreated - b.timecreated);

      return {
        data: activeFriends || [],
      };
    },
  });

  return {
    isLoading: isLoading || isStatusLoading,
    data,
  };
};

export default useActiveFriends;
