import { getPreferenceValues, Grid } from "@raycast/api";
import { useCallback, useRef, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { searchWallpapers } from "./api";
import { Wallpaper } from "./types";
import { WallpaperGrid } from "./components/WallpaperGrid";

export default function SearchWallpapers() {
  const { apiKey, sfwOnly } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [categories, setCategories] = useState("111");
  const [purity, setPurity] = useState("100");
  const [sorting, setSorting] = useState("date_added");
  const [topRange, setTopRange] = useState("1M");

  const allWallpapers = useRef<Wallpaper[]>([]);
  const currentPage = useRef(1);
  const hasMore = useRef(true);
  const seedRef = useRef<string | undefined>(undefined);

  const { isLoading, revalidate } = useCachedPromise(
    async (
      query: string,
      cats: string,
      pur: string,
      sort: string,
      range: string,
      page: number,
    ) => {
      const result = await searchWallpapers({
        q: query || undefined,
        categories: cats,
        purity: sfwOnly ? "100" : pur,
        sorting: sort,
        topRange: sort === "toplist" ? range : undefined,
        page,
        seed: sort === "random" ? seedRef.current : undefined,
      });
      if (sort === "random" && result.meta.seed) {
        seedRef.current = result.meta.seed;
      }
      hasMore.current = result.meta.current_page < result.meta.last_page;
      if (page === 1) {
        allWallpapers.current = result.data;
      } else {
        allWallpapers.current = [...allWallpapers.current, ...result.data];
      }
      return allWallpapers.current;
    },
    [searchText, categories, purity, sorting, topRange, currentPage.current],
    { keepPreviousData: true },
  );

  const resetAndRevalidate = useCallback(
    (setter: (val: string) => void, value: string) => {
      setter(value);
      allWallpapers.current = [];
      currentPage.current = 1;
      hasMore.current = true;
      seedRef.current = undefined;
    },
    [],
  );

  const onLoadMore = useCallback(() => {
    if (hasMore.current && !isLoading) {
      currentPage.current += 1;
      revalidate();
    }
  }, [isLoading, revalidate]);

  const filterDropdown = (
    <Grid.Dropdown
      tooltip="Filters"
      storeValue
      onChange={(value) => {
        const [type, val] = value.split(":");
        if (type === "cat") resetAndRevalidate(setCategories, val);
        else if (type === "pur") resetAndRevalidate(setPurity, val);
        else if (type === "sort") resetAndRevalidate(setSorting, val);
        else if (type === "range") resetAndRevalidate(setTopRange, val);
      }}
    >
      <Grid.Dropdown.Section title="Categories">
        <Grid.Dropdown.Item title="All" value="cat:111" />
        <Grid.Dropdown.Item title="General" value="cat:100" />
        <Grid.Dropdown.Item title="Anime" value="cat:010" />
        <Grid.Dropdown.Item title="People" value="cat:001" />
        <Grid.Dropdown.Item title="General + Anime" value="cat:110" />
        <Grid.Dropdown.Item title="General + People" value="cat:101" />
        <Grid.Dropdown.Item title="Anime + People" value="cat:011" />
      </Grid.Dropdown.Section>
      {!sfwOnly && (
        <Grid.Dropdown.Section title="Purity">
          <Grid.Dropdown.Item title="SFW" value="pur:100" />
          <Grid.Dropdown.Item title="SFW + Sketchy" value="pur:110" />
          {apiKey && (
            <Grid.Dropdown.Item title="All (incl. NSFW)" value="pur:111" />
          )}
        </Grid.Dropdown.Section>
      )}
      <Grid.Dropdown.Section title="Sorting">
        <Grid.Dropdown.Item title="Date Added" value="sort:date_added" />
        <Grid.Dropdown.Item title="Relevance" value="sort:relevance" />
        <Grid.Dropdown.Item title="Random" value="sort:random" />
        <Grid.Dropdown.Item title="Views" value="sort:views" />
        <Grid.Dropdown.Item title="Favorites" value="sort:favorites" />
        <Grid.Dropdown.Item title="Toplist" value="sort:toplist" />
      </Grid.Dropdown.Section>
      {sorting === "toplist" && (
        <Grid.Dropdown.Section title="Top Range">
          <Grid.Dropdown.Item title="Last Day" value="range:1d" />
          <Grid.Dropdown.Item title="Last 3 Days" value="range:3d" />
          <Grid.Dropdown.Item title="Last Week" value="range:1w" />
          <Grid.Dropdown.Item title="Last Month" value="range:1M" />
          <Grid.Dropdown.Item title="Last 3 Months" value="range:3M" />
          <Grid.Dropdown.Item title="Last 6 Months" value="range:6M" />
          <Grid.Dropdown.Item title="Last Year" value="range:1y" />
        </Grid.Dropdown.Section>
      )}
    </Grid.Dropdown>
  );

  return (
    <WallpaperGrid
      wallpapers={allWallpapers.current}
      isLoading={isLoading}
      hasMore={hasMore.current}
      onLoadMore={onLoadMore}
      searchBarPlaceholder="Search wallpapers..."
      searchBarAccessory={filterDropdown}
      onSearchTextChange={(text) => resetAndRevalidate(setSearchText, text)}
      throttle
    />
  );
}
