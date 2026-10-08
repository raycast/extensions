import { useState } from "react";

import { Grid } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import type { SearchImageType } from "@/types";

import { Pixabay } from "@/lib/api";
import { capitalizeFirstLetter } from "@/lib/utils";

import ImageGridItem from "@/components/ImageGridItem";

export default function SearchCommand(): JSX.Element {
  const [imagetype, setImagetype] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, data } = useCachedPromise(
    async (searchText: string | undefined, imagetype: string) => {
      const result = await Pixabay.searchImages(searchText, {
        imagetype: imagetype as SearchImageType,
      });
      return result;
    },
    [searchText, imagetype],
    {
      keepPreviousData: true,
    },
  );
  const imageTypes: SearchImageType[] = ["all", "photo", "illustration", "vector"];
  return (
    <Grid
      searchBarPlaceholder="Search Images"
      isLoading={isLoading}
      throttle
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Video Type" onChange={setImagetype}>
          {imageTypes.map((t) => (
            <Grid.Dropdown.Item key={t} title={capitalizeFirstLetter(t)} value={t} />
          ))}
        </Grid.Dropdown>
      }
    >
      {data?.hits?.map((hit) => <ImageGridItem key={hit.id} hit={hit} />)}
      {!searchText && <Grid.EmptyView title="Enter query to search Images on pixabay.com" icon={"pixabay.png"} />}
    </Grid>
  );
}
