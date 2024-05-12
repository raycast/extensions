import { Action, ActionPanel, Color, Grid, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import feed from "./api/feed";
import { eachHex } from "./utils/util";
import { useState } from "react";
import { PaletteDetail } from "./components/PaletteDetail";
import { IndexForm } from "./components/IndexForm";
import { IndexData, Tags } from "./type";
import fetch from "cross-fetch";
import like from "./api/like";
import { remove, write } from "./utils/storage";

global.fetch = fetch;

export default function Command() {
  const [sort, setSort] = useState("new");
  const [tags, setTags] = useState<Tags>({
    colors: [],
    collections: [],
  });

  const { isLoading, data, pagination, mutate } = feed(sort, tags);

  const likeFunc = async (code: string, svg: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Liking Palette" });
    try {
      await mutate(
        like(code).then(() => write(code, svg)),
        {
          optimisticUpdate: (data: IndexData[]) => {
            return data.map((item) => {
              if (item.data.code === code) {
                return {
                  ...item,
                  data: {
                    ...item.data,
                    likes: (parseInt(item.data.likes) + 1).toString(),
                  },
                };
              }
              return item;
            });
          },
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Liked";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not like palette";
      if (error instanceof Error) toast.message = error.message;
    }
  };
  const unfavorableFunc = async (id: string) => {
    await mutate(remove(id), {
      optimisticUpdate: (data: IndexData[]) => {
        return data.map((item) => {
          if (item.data.code === id) {
            return {
              ...item,
              liked: false,
            };
          }
          return item;
        });
      },
    });
  };

  const { pop } = useNavigation();
  return (
    <Grid
      columns={5}
      aspectRatio={"9/16"}
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder={`Search in ${(data || []).length} palettes`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Sort by" storeValue={true} defaultValue="new" onChange={setSort}>
          <Grid.Dropdown.Item value="new" title="New" />
          <Grid.Dropdown.Item value="random" title="Random" />

          <Grid.Dropdown.Section title="Popular">
            <Grid.Dropdown.Item value="popular-month" title="Month" />
            <Grid.Dropdown.Item value="popular-year" title="Year" />
            <Grid.Dropdown.Item value="popular-all" title="All" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {(data || []).map((item) => {
        return (
          <Grid.Item
            actions={
              <ActionPanel>
                <Action.Push target={<PaletteDetail id={item.data.code} />} title="View Details" icon={Icon.Bird} />
                <Action.Push
                  target={
                    <IndexForm
                      tags={tags}
                      submitCallback={(values) => {
                        setTags(values);
                        pop();
                      }}
                    />
                  }
                  title="Search Palettes"
                  icon={Icon.MagnifyingGlass}
                />
                <Action
                  title="Like & Favorite"
                  onAction={() => likeFunc(item.data.code, item.svg)}
                  icon={Icon.Star}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "l",
                  }}
                />
                <Action
                  title="Unfavorite"
                  onAction={() => unfavorableFunc(item.data.code)}
                  icon={Icon.StarDisabled}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "n",
                  }}
                />
              </ActionPanel>
            }
            accessory={item.liked ? { icon: { source: Icon.Star, tintColor: Color.Yellow } } : undefined}
            key={item.data.code}
            title={`❤ ${item.data.likes}`}
            keywords={Array.from(eachHex(item.data.code))}
            content={item.svg}
          />
        );
      })}
    </Grid>
  );
}
