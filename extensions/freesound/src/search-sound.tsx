import { useEffect, useState } from "react";

import { Action, ActionPanel, List } from "@raycast/api";

import { DEFAULT_KEYS } from "@/lib/api";

import useSearch from "@/hooks/useSearch";
import useSoundPlayer from "@/hooks/useSoundPlayer";

import ListItem from "@/components/ListItem";

export default function SearchSound() {
  const [query, setQuery] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const { data, isLoading, pagination } = useSearch(query, {}, DEFAULT_KEYS);
  const { playSound, playState, stop } = useSoundPlayer();

  const isPlaying = playState.filePath !== null && playState.id !== null;

  useEffect(() => {
    stop();
  }, [query]);

  return (
    <List
      searchBarPlaceholder="Search for sounds"
      onSearchTextChange={setQuery}
      searchText={query}
      throttle
      isLoading={isLoading || isPlaying}
      pagination={pagination}
      isShowingDetail={isShowingDetail}
      actions={<ActionPanel>{isPlaying ? <Action title="Stop" onAction={stop} /> : null}</ActionPanel>}
    >
      {data?.map((sound) => (
        <ListItem
          sound={sound}
          isShowingDetail={isShowingDetail}
          setIsShowingDetail={setIsShowingDetail}
          playSound={playSound}
          stop={stop}
          playState={playState}
          key={`sound-${sound.id}`}
        />
      ))}
      {!isLoading ? (
        <List.EmptyView title={query === "" ? "Search Sounds" : "No sounds found"} icon={{ source: "freesound.svg" }} />
      ) : (
        <List.EmptyView title="Searching..." icon={{ source: "freesound.svg" }} />
      )}
    </List>
  );
}
