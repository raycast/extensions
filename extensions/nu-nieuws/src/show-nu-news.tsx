import { Grid, List, getPreferenceValues } from "@raycast/api";
import { nuFeeds } from "./util/feeds";
import { useRSSFeeds } from "./util/rss";
import ListItem from "./component/ListItem";
import { useMemo, useState } from "react";
import CategoryFilter from "./component/CategoryFilter";
import GridItem from "./component/GridItem";

type Preferences = {
  show?: "list" | "grid";
  gridSize?: "2" | "3" | "4" | "5" | "6";
  ignoreVideos?: boolean;
};

export default function Command() {
  const { show = "list", gridSize = "4", ignoreVideos = false } = getPreferenceValues<Preferences>();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const urls = useMemo(() => {
    return nuFeeds
      .filter((feed) => {
        if (categoryFilter === "all") {
          return true;
        }
        return feed.id === categoryFilter;
      })
      .map((feed) => feed.url);
  }, [categoryFilter]);
  const { isLoading, data } = useRSSFeeds(urls, ignoreVideos);

  if (show === "grid") {
    return (
      <Grid
        isLoading={isLoading}
        searchBarPlaceholder="Search for news..."
        searchBarAccessory={<CategoryFilter feeds={nuFeeds} onFilterChange={setCategoryFilter} />}
        columns={parseInt(gridSize, 10)}
        aspectRatio="16/9"
        fit={Grid.Fit.Fill}
      >
        {data?.map((item) => <GridItem key={item.guid} item={item} />)}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for news..."
      searchBarAccessory={<CategoryFilter feeds={nuFeeds} onFilterChange={setCategoryFilter} />}
    >
      {data?.map((item) => <ListItem key={item.guid} item={item} />)}
    </List>
  );
}
