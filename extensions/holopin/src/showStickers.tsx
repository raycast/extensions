import { Action, ActionPanel, getPreferenceValues, Grid, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import ShowDetail from "./showDetail";
import { HolopinApiResponse, Preferences, Sticker } from "./types";

export default function ShowStickers() {
  const { username } = getPreferenceValues<Preferences>();

  const { isLoading, data, revalidate } = useFetch<HolopinApiResponse>(
    `https://holopin.io/api/stickers?username=${username}`,
    {
      keepPreviousData: true,
    }
  );

  const [searchText, setSearchText] = useState("");
  const [filteredStickers, filterStickers] = useState<Sticker[]>([]);

  useEffect(() => {
    console.log("searchText", searchText);
    filterStickers(
      data?.data.stickers?.filter(
        (item) =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.organization.name.toLowerCase().includes(searchText.toLowerCase())
      ) ?? []
    );
  }, [searchText]);

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      navigationTitle={`${username}'s Holopin badges`}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    >
      {!isLoading &&
        filteredStickers?.map((sticker) => (
          <Grid.Item
            key={sticker.id}
            content={sticker.image}
            title={sticker.name}
            subtitle={sticker.organization.name}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Eye} title="Preview sticker" target={<ShowDetail {...sticker} />} />
                {sticker.UserSticker[0] && (
                  <Action.OpenInBrowser
                    icon={Icon.Globe}
                    title="View in browser"
                    url={`https://holopin.io/userbadge/${sticker.UserSticker[0].id}`}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
