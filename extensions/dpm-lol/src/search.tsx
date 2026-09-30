import { useState, useMemo } from "react";
import { Action, ActionPanel, List, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Summoner } from "./types";
import { PLATFORM_MAP } from "./utils";

function getPlatformTag(platform: string) {
  return PLATFORM_MAP[platform] ?? { value: platform, color: Color.Red };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const encodedSearchText = encodeURIComponent(searchText);

  const { isLoading, data } = useFetch<Summoner[]>(`https://dpm.lol/v1/search?gameName=${encodedSearchText}`, {
    headers: {
      "User-Agent": "Raycast",
      Accept: "application/json",
    },
    keepPreviousData: true,
    execute: encodedSearchText.length > 0,
  });

  const dataWithAssets = useMemo(
    () =>
      data?.map((item) => ({
        ...item,
        playerIcon: `https://dpm.lol/esport/players/${item.displayName}.webp`,
        profileIcon: `https://ddragon.leagueoflegends.com/cdn/15.7.1/img/profileicon/${item.profileIcon}.png`,
        teamIcon: item.team ? `https://dpm.lol/esport/teams/${item.team}.webp` : undefined,
      })) ?? [],
    [data],
  );

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
      {dataWithAssets.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={{ source: "https://dpm.lol/champions/LuluHome.webp" }}
          title={searchText ? "No summoner found" : "Search Summoner"}
        />
      ) : (
        dataWithAssets.map((item) => (
          <List.Item
            key={item.puuid}
            title={item.gameName}
            subtitle={`#${item.tagLine}`}
            icon={item.displayName ? item.playerIcon : item.profileIcon}
            accessories={
              [
                item.role === "PRO" && item.teamIcon ? { icon: item.teamIcon } : null,
                item.displayName ? { text: item.displayName } : null,
                item.role === "PRO" ? { tag: { value: item.role, color: Color.Yellow } } : null,
                { tag: getPlatformTag(item.platform) },
              ].filter(Boolean) as List.Item.Accessory[]
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://dpm.lol/${item.gameName}-${item.tagLine}`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
