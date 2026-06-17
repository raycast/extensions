import {
  Action,
  ActionPanel,
  Cache,
  Color,
  Icon,
  List,
  open,
} from "@raycast/api";
import debounce from "lodash/debounce.js";
import { capitalCase } from "change-case";
import { useEffect, useState } from "react";
import { searchSteamGames, getProtonDbInfo } from "./api.js";
import { DbInfo, SteamGame } from "./types.js";
import { dbInfoPrefix, scoreColors, tagColors } from "./utils.js";

type LaunchContext = {
  steamAppName?: string;
};

const cache = new Cache();

export default function Browse({
  launchContext = {},
}: {
  launchContext?: LaunchContext;
}) {
  const { steamAppName } = launchContext;
  const [isLoading, setIsLoading] = useState(Boolean(steamAppName));
  const [isShowingDetail, setIsShowingDetail] = useState(Boolean(steamAppName));
  const [searchString, setSearchString] = useState(steamAppName ?? "");
  const [games, setGames] = useState<SteamGame[]>([]);

  const loadGames = debounce(async (keyword: string) => {
    const games = await searchSteamGames(keyword).catch(() => []);
    setGames(games);
  }, 500);

  const loadInfo = async (steamAppId: number) => {
    const info = await getProtonDbInfo(steamAppId).catch(() => undefined);
    if (!info) return;
    cache.set(dbInfoPrefix + steamAppId.toString(), JSON.stringify(info));
  };

  const cacheInfo = async (ids: number[]) => {
    await Promise.all(ids.map((id) => loadInfo(id)));
    setIsLoading(false);
  };

  useEffect(() => {
    if (!searchString) return;
    setIsLoading(true);
    loadGames(searchString);
  }, [searchString]);

  useEffect(() => {
    if (games.length === 0) return;
    cacheInfo(games.map(({ appid }) => appid));
  }, [games]);

  return (
    <List
      isShowingDetail={isShowingDetail}
      isLoading={isLoading}
      searchText={searchString}
      onSearchTextChange={setSearchString}
    >
      {searchString && games.length > 0 ? (
        games.map((game) => {
          const cacheKey = dbInfoPrefix + game.appid.toString();
          const hasInfo = cache.has(cacheKey);
          if (!hasInfo) return null;
          const info = JSON.parse(cache.get(cacheKey)!) as DbInfo;
          const steamLink = `https://store.steampowered.com/app/${game.appid}`;
          const protonDbLink = `https://www.protondb.com/app/${game.appid}`;
          return (
            <List.Item
              key={game.appid.toString()}
              title={game.name}
              accessories={
                isShowingDetail
                  ? undefined
                  : [
                      {
                        tag: {
                          value: capitalCase(info.trendingTier),
                          color: tagColors[info.trendingTier],
                        },
                      },
                      {
                        tag: {
                          value: info.score.toString(),
                          color: scoreColors(info.score),
                        },
                      },
                      {
                        icon: Icon.SpeechBubble,
                        tag: {
                          value: info.total.toString(),
                          color: Color.Blue,
                        },
                      },
                    ]
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {Object.entries(info).map(([key, value]) => {
                        return (
                          <List.Item.Detail.Metadata.TagList
                            key={key}
                            title={
                              key === "total"
                                ? capitalCase(key) + " Reports"
                                : capitalCase(key)
                            }
                          >
                            <List.Item.Detail.Metadata.TagList.Item
                              icon={
                                key === "total" ? Icon.SpeechBubble : undefined
                              }
                              text={
                                ["score", "total"].includes(key)
                                  ? value.toString()
                                  : capitalCase(value.toString())
                              }
                              color={
                                key === "score"
                                  ? scoreColors(Number(value))
                                  : key === "total"
                                    ? Color.Blue
                                    : tagColors[value.toString()]
                              }
                              onAction={() => {
                                if (key === "total") {
                                  open(protonDbLink);
                                }
                              }}
                            />
                          </List.Item.Detail.Metadata.TagList>
                        );
                      })}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link
                        title="Steam"
                        text={steamLink}
                        target={steamLink}
                      />
                      <List.Item.Detail.Metadata.Link
                        title="ProtonDB"
                        text={protonDbLink}
                        target={protonDbLink}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Detail"
                    onAction={() => setIsShowingDetail(!isShowingDetail)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.EmptyView
          title={
            isLoading
              ? "Searching..."
              : searchString
                ? "No Result"
                : "Start Browsing"
          }
          description="Search for a game to view its score"
        />
      )}
    </List>
  );
}
