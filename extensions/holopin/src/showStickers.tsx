import { Action, ActionPanel, getPreferenceValues, Grid, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { useHolopinAPI } from "./hooks/useHolopinAPI";
import ShowDetail from "./showDetail";
import { Preferences, Sticker } from "./types";

export default function ShowStickers() {
  const { username } = getPreferenceValues<Preferences>();

  const { isLoading, data, revalidate } = useHolopinAPI(username);
  const [searchText, setSearchText] = useState("");
  const [filteredStickers, filterStickers] = useState<Sticker[]>([]);

  useEffect(() => {
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
      filtering={false}
      onSearchTextChange={setSearchText}
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
                <Action.Push icon={Icon.Eye} title="Show Detail" target={<ShowDetail {...sticker} />} />
                {sticker.UserSticker[0] && (
                  <Action.OpenInBrowser url={`https://holopin.io/userbadge/${sticker.UserSticker[0].id}`} />
                )}
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
