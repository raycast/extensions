import { useState } from "react";

import { Grid } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import type { SearchVideoType } from "@/types/index";

import { Pixabay } from "@/lib/api";
import { capitalizeFirstLetter } from "@/lib/utils";

import VideoGridItem from "@/components/VideoGridItem";

export default function SearchVideosCommand(): JSX.Element {
  const [videotype, setVideotype] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, data } = useCachedPromise(
    async (searchText: string | undefined, videotype: string) => {
      const result = await Pixabay.searchVideos(searchText, {
        videotype: videotype as SearchVideoType,
      });
      return result;
    },
    [searchText, videotype],
    {
      keepPreviousData: true,
    },
  );
  const videoTypes: SearchVideoType[] = ["all", "film", "animation"];
  return (
    <Grid
      searchBarPlaceholder="Search Videos"
      isLoading={isLoading}
      throttle
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Video Type" onChange={setVideotype}>
          {videoTypes.map((t) => (
            <Grid.Dropdown.Item key={t} title={capitalizeFirstLetter(t)} value={t} />
          ))}
        </Grid.Dropdown>
      }
    >
      {data?.hits?.map((hit) => <VideoGridItem key={hit.id} hit={hit} />)}
      {!searchText && <Grid.EmptyView title="Enter query to search Videos on pixabay.com" icon={"pixabay.png"} />}
    </Grid>
  );
}
