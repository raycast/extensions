import { Color, environment, Grid, Icon, showToast, Toast } from "@raycast/api";
import feed from "./api/feed";
import { eachHex } from "./utils/util";
import { useCallback, useEffect, useState } from "react";
import { Tags } from "./type";
import fetch from "cross-fetch";
import like from "./api/like";
import fs from "fs";
import { useFavorite } from "./hook/useFavorite";
import { IndexActionPanel } from "./components/IndexActionPanel";

global.fetch = fetch;
const initialTitle = undefined;

export default function Command() {
  const [sort, setSort] = useState("new");
  const [tags, setTags] = useState<Tags>({
    colors: [],
    collections: [],
  });
  useEffect(() => {
    if (!fs.existsSync(environment.supportPath + "/palette")) {
      fs.mkdirSync(environment.supportPath + "/palette");
    }
  }, []);

  const { isLoading, data, pagination, mutate } = feed(sort, tags);

  const { isLoading: favoriteLoading, value, favorite, unFavorite } = useFavorite();

  const isFavourite = useCallback(
    (code: string) => {
      if (value) {
        return value.map((item) => item.code).includes(code);
      }
      return false;
    },
    [value],
  );

  const favoriteFunc = async (code: string, svg: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Liking Palette" });
    try {
      await mutate(like(code).then(() => favorite(code, svg)));
      toast.style = Toast.Style.Success;
      toast.title = "Liked";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not like palette";
      if (error instanceof Error) toast.message = error.message;
    }
  };

  const [title, setTitle] = useState<string | undefined>(initialTitle);

  useEffect(() => {
    const choseTags = [...tags.colors, ...tags.collections];
    if (choseTags.length > 0) {
      setTitle("Searched tags: " + choseTags.join(", "));
    } else {
      setTitle(initialTitle);
    }
  }, [tags, sort]);

  return (
    <Grid
      columns={5}
      aspectRatio={"9/16"}
      inset={Grid.Inset.Zero}
      isLoading={isLoading || favoriteLoading}
      pagination={pagination}
      searchBarPlaceholder={`Search in ${((sort === "collection" ? value : data) || []).length} palettes`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Sort by" storeValue={true} defaultValue="new" onChange={setSort}>
          <Grid.Dropdown.Item value="new" title="New" />
          <Grid.Dropdown.Item value="random" title="Random" />
          <Grid.Dropdown.Item value="favorite" title="My Favorite" />

          <Grid.Dropdown.Section title="Popular">
            <Grid.Dropdown.Item value="popular-month" title="Month" />
            <Grid.Dropdown.Item value="popular-year" title="Year" />
            <Grid.Dropdown.Item value="popular-all" title="All" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {sort === "favorite" && (
        <Grid.Section>
          {(value || []).map((item) => {
            return (
              <Grid.Item
                key={item.code}
                content={item.svg}
                keywords={Array.from(eachHex(item.code))}
                actions={
                  <IndexActionPanel
                    code={item.code}
                    tags={tags}
                    setTags={setTags}
                    favorite={{ isLoading: favoriteLoading, value }}
                    isFavourite={true}
                    unFavoriteFunc={() => unFavorite(item.code)}
                  />
                }
              />
            );
          })}
        </Grid.Section>
      )}
      <Grid.Section title={title}>
        {(data || []).map((item, index) => {
          return (
            <Grid.Item
              actions={
                <IndexActionPanel
                  code={item.data.code}
                  tags={tags}
                  setTags={setTags}
                  favorite={{ isLoading: favoriteLoading, value }}
                  isFavourite={isFavourite(item.data.code)}
                  unFavoriteFunc={() => unFavorite(item.data.code)}
                  favoriteFunc={() => favoriteFunc(item.data.code, item.svg)}
                />
              }
              accessory={
                isFavourite(item.data.code) ? { icon: { source: Icon.Star, tintColor: Color.Yellow } } : undefined
              }
              key={sort === "random" ? item.data.code + index : item.data.code}
              title={`❤ ${item.data.likes}`}
              subtitle={item.data.date}
              keywords={Array.from(eachHex(item.data.code))}
              content={item.svg}
            />
          );
        })}
      </Grid.Section>
    </Grid>
  );
}
