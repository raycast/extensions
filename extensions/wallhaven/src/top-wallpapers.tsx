import { getPreferenceValues, Grid } from "@raycast/api";
import { useCallback, useRef, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { searchWallpapers } from "./api";
import { Wallpaper } from "./types";
import { WallpaperGrid } from "./components/WallpaperGrid";

export default function TopWallpapers() {
  const { sfwOnly } = getPreferenceValues<Preferences>();
  const [topRange, setTopRange] = useState("1M");
  const allWallpapers = useRef<Wallpaper[]>([]);
  const currentPage = useRef(1);
  const hasMore = useRef(true);

  const { isLoading, revalidate } = useCachedPromise(
    async (range: string, page: number) => {
      const result = await searchWallpapers({
        sorting: "toplist",
        topRange: range,
        purity: sfwOnly ? "100" : undefined,
        page,
      });
      hasMore.current = result.meta.current_page < result.meta.last_page;
      if (page === 1) {
        allWallpapers.current = result.data;
      } else {
        allWallpapers.current = [...allWallpapers.current, ...result.data];
      }
      return allWallpapers.current;
    },
    [topRange, currentPage.current],
    { keepPreviousData: true },
  );

  const onLoadMore = useCallback(() => {
    if (hasMore.current && !isLoading) {
      currentPage.current += 1;
      revalidate();
    }
  }, [isLoading, revalidate]);

  const dropdown = (
    <Grid.Dropdown
      tooltip="Time Range"
      storeValue
      onChange={(value) => {
        setTopRange(value);
        allWallpapers.current = [];
        currentPage.current = 1;
        hasMore.current = true;
      }}
    >
      <Grid.Dropdown.Item title="Last Day" value="1d" />
      <Grid.Dropdown.Item title="Last 3 Days" value="3d" />
      <Grid.Dropdown.Item title="Last Week" value="1w" />
      <Grid.Dropdown.Item title="Last Month" value="1M" />
      <Grid.Dropdown.Item title="Last 3 Months" value="3M" />
      <Grid.Dropdown.Item title="Last 6 Months" value="6M" />
      <Grid.Dropdown.Item title="Last Year" value="1y" />
    </Grid.Dropdown>
  );

  return (
    <WallpaperGrid
      wallpapers={allWallpapers.current}
      isLoading={isLoading}
      hasMore={hasMore.current}
      onLoadMore={onLoadMore}
      searchBarPlaceholder="Top wallpapers"
      searchBarAccessory={dropdown}
    />
  );
}
