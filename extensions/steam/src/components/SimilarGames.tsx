import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { cachedDetails } from "../lib/details";
import { useMyGames, useResultsWithDetails } from "../lib/fetcher";
import { useShowingDetail } from "../lib/hooks";
import { getSimilarGames } from "../lib/similar";
import { appidFromItemId } from "../lib/util";
import { DynamicGameListItem } from "./ListItems";

export const SimilarGames = ({ appid, name }: { appid: number; name?: string }) => {
  const {
    data: sections,
    isLoading: finding,
    error,
  } = useCachedPromise(getSimilarGames, [appid], {
    onError: () => undefined,
  });
  const found = useMemo(() => sections?.flatMap((section) => section.appids.map((id) => ({ appid: id }))), [sections]);
  const { games, loading } = useResultsWithDetails(found);
  const isLoading = finding || loading;
  const [hovered, setHovered] = useState(0);
  const { data: myGames } = useMyGames();
  const { showingDetail, toggleDetail } = useShowingDetail();

  const shown = new Set(games?.map((game) => game.appid));
  const groups = (sections ?? [])
    .map((section) => ({
      title: section.title,
      games: section.appids
        .map((id) => ({ appid: id, data: cachedDetails(id)?.data }))
        .filter(({ appid, data }) => shown.has(appid) && data?.name && data.type !== "demo")
        .map(({ appid, data }) => ({ appid, name: data?.name })),
    }))
    .filter((group) => group.games.length);

  return (
    <List
      navigationTitle={name ? `Games Like ${name}` : "Similar Games"}
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={showingDetail && groups.length > 0}
      searchBarPlaceholder=""
      onSelectionChange={(id) => setHovered(appidFromItemId(id))}
    >
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Could Not Load Similar Games" description={error.message} />
      ) : (
        <List.EmptyView icon={Icon.Stars} title={isLoading ? "Finding Similar Games…" : "No Similar Games"} />
      )}
      {groups.map((group) => (
        <List.Section key={group.title} title={group.title}>
          {group.games.map((game) => (
            <DynamicGameListItem
              context="similar"
              key={game.appid}
              game={game}
              ready={hovered === game.appid}
              myGames={myGames}
              showingDetail={showingDetail}
              onToggleDetail={toggleDetail}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};
