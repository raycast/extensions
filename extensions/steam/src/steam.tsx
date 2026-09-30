import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
  confirmAlert,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { rm } from "fs/promises";
import { join } from "path";
import { useEffect, useMemo, useState } from "react";
import { useBatchDetails, useGamesSearch, useMyGames, useLibraryFirstSeen, useResultsWithDetails } from "./lib/fetcher";
import { addedText, appidFromItemId, itemId, playedText } from "./lib/util";
import { MyGamesListType, DynamicGameListItem } from "./components/ListItems";
import { MyGames } from "./components/MyGames";
import { Search, SearchList } from "./components/Search";
import { MIN_QUERY_LENGTH } from "./components/SearchEmptyView";
import { DefaultActions } from "./components/Actions";
import { useIsLoggedIn, useKeyRejected, useShowingDetail } from "./lib/hooks";
import { GameDataSimple } from "./types";
import { WebApiKeyNotice } from "./errors";

const WEEK = 7 * 24 * 60 * 60;

export default function Command() {
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState(0);
  const isLoggedIn = useIsLoggedIn();
  const { showingDetail, toggleDetail } = useShowingDetail();
  const {
    data: foundGames,
    isLoading: searching,
    isError: searchError,
    listStatus,
  } = useGamesSearch({
    term: search,
    execute: search.trim().length >= MIN_QUERY_LENGTH,
  });
  const { games: searchedGames, loading: detailsLoading } = useResultsWithDetails(foundGames);
  const searchLoading = searching || detailsLoading;
  const [recentlyViewed, setRecentlyViewed] = useState<GameDataSimple[]>();

  const { data: myGames, isLoading: myGamesLoading } = useMyGames();
  const firstSeen = useLibraryFirstSeen(myGames);
  const recentlyPlayed = useMemo(
    () =>
      (myGames ?? [])
        .filter((game) => game.rtime_last_played)
        .sort((a, b) => (b.rtime_last_played ?? 0) - (a.rtime_last_played ?? 0))
        .slice(0, 3),
    [myGames],
  );
  const recentlyAdded = useMemo(
    () =>
      (myGames ?? [])
        .filter((game) => {
          const entry = firstSeen.get(game.appid);
          return entry && !entry.baseline && entry.firstSeen > Date.now() / 1000 - WEEK;
        })
        .sort((a, b) => (firstSeen.get(b.appid)?.firstSeen ?? 0) - (firstSeen.get(a.appid)?.firstSeen ?? 0))
        .slice(0, 3),
    [myGames, firstSeen],
  );
  useBatchDetails([...(recentlyViewed ?? []), ...recentlyAdded, ...recentlyPlayed].map((game) => game.appid));
  const [showKeyNotice, setShowKeyNotice] = useState(false);
  const keyRejected = useKeyRejected();

  useEffect(() => {
    if (getPreferenceValues<Preferences>().token?.trim()) return;
    LocalStorage.getItem("key-notice-shown").then(async (shown) => {
      // Dev builds show it on every open so the message can be checked without resetting storage
      if (shown && !environment.isDevelopment) return;
      await LocalStorage.setItem("key-notice-shown", true);
      const addKey = await confirmAlert({
        title: "Add a Steam Web API Key",
        message: "A future version will require a Steam Web API key. Adding one now also makes search faster.",
        primaryAction: { title: "Add a Key" },
        dismissAction: { title: "Not Now" },
      });
      if (addKey) setShowKeyNotice(true);
    });
  }, []);

  useEffect(() => {
    // Older versions kept an SWR cache here that nothing reads any more
    rm(join(environment.supportPath, "swr-cache"), { force: true }).catch(() => undefined);
  }, []);

  useEffect(() => {
    LocalStorage.getItem("recently-viewed").then((gameDataRaw) => {
      setRecentlyViewed(gameDataRaw ? (JSON.parse(String(gameDataRaw)) ?? []) : []);
    });
  }, []);

  const loading = () => {
    if (search) {
      return searchLoading;
    }
    // Until history loads the list has no rows, and Raycast fills that gap with its "No Results" screen
    if (recentlyViewed === undefined) return true;
    if (isLoggedIn) {
      return myGamesLoading;
    }
    // If not logged in, we don't need to wait for data
    return false;
  };

  if (keyRejected) return <WebApiKeyNotice />;

  if (showKeyNotice) {
    return <WebApiKeyNotice onContinue={() => setShowKeyNotice(false)} />;
  }

  return (
    <List
      isLoading={loading()}
      isShowingDetail={showingDetail && Boolean(search) && Boolean(searchedGames?.length)}
      selectedItemId={search && searchedGames?.[0] ? itemId("Search", searchedGames[0].appid, search) : undefined}
      onSearchTextChange={setSearch}
      onSelectionChange={(id) => setHovered(appidFromItemId(id))}
      throttle
      searchBarPlaceholder="Search games by title..."
    >
      {search ? (
        <SearchList
          search={search}
          searchedGames={searchedGames}
          isLoading={searchLoading}
          listStatus={listStatus}
          error={searchError}
          hovered={hovered}
          showingDetail={showingDetail}
          onToggleDetail={toggleDetail}
        />
      ) : (
        <>
          {!isLoggedIn && recentlyViewed?.length === 0 ? (
            <List.EmptyView
              icon={Icon.GameController}
              title="Search Steam Games"
              description="Type a game title to search. Add your Web API Key and Steam ID in the preferences to see your own games."
              actions={
                <ActionPanel>
                  <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          ) : null}
          {isLoggedIn ? (
            <List.Item
              title="My Games"
              icon={{ source: "command-icon.png" }}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.List} title="View My Games" target={<MyGames />} />
                  <DefaultActions />
                </ActionPanel>
              }
            />
          ) : null}
          {isLoggedIn ? (
            <List.Item
              title="Search Steam Games"
              icon={{ source: "command-icon.png" }}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Binoculars} title="Search Steam Games" target={<Search />} />
                  <DefaultActions />
                </ActionPanel>
              }
            />
          ) : null}
          {recentlyAdded.length ? (
            <List.Section title="Recently Added Games">
              {recentlyAdded.map((game) => (
                <MyGamesListType
                  key={game.appid}
                  game={game}
                  detail={addedText(firstSeen.get(game.appid)?.firstSeen)}
                />
              ))}
            </List.Section>
          ) : null}
          {recentlyViewed && recentlyViewed?.length > 0 ? (
            <List.Section title="Recently Viewed Games">
              {recentlyViewed.slice(0, 3).map((game) => (
                <DynamicGameListItem
                  context="recently-viewed"
                  key={game.appid}
                  game={game}
                  ready={true}
                  myGames={myGames}
                />
              ))}
            </List.Section>
          ) : null}
          {recentlyPlayed.length ? (
            <List.Section title="Recently Played Games">
              {recentlyPlayed.map((game) => (
                <MyGamesListType key={game.appid} game={game} detail={playedText(game.rtime_last_played)} />
              ))}
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
}
