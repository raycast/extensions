import { getPreferenceValues, Grid, List } from "@raycast/api";
import React, { useState } from "react";
import { getPlaceholderImages } from "./hooks/hooks";
import { Preferences } from "./types/preferences";
import { PlaceholderEmptyView } from "./components/placeholder-empty-view";
import { ActionOnPlaceholderImage } from "./components/action-on-placeholder-image";

export default function SearchPlaceholderImages() {
  const preferences = getPreferenceValues<Preferences>();
  const [page, setPage] = useState<number>(1);
  const { picsumImages, isLoading } = getPlaceholderImages(page, parseInt(preferences.perPage));

  return preferences.layout === "List" ? (
    <List
      isShowingDetail={picsumImages.length !== 0 && !isLoading}
      isLoading={isLoading}
      searchBarPlaceholder={"Search images"}
    >
      <PlaceholderEmptyView layout={preferences.layout} />

      {picsumImages.map((value) => {
        return (
          <List.Item
            key={value.url}
            icon={{ source: { light: "picsum-icon.png", dark: "picsum-icon@dark.png" } }}
            title={{ value: value.author, tooltip: "Author" }}
            detail={
              <List.Item.Detail
                isLoading={false}
                markdown={`<img src="${value.download_url}" alt="${value.author}" height="190" />`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Id" text={value.id} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Size" text={value.width + " ✕ " + value.height} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Download URL" text={value.download_url} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Unsplash URL" text={value.url} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionOnPlaceholderImage picsumImage={value} preferences={preferences} page={page} setPage={setPage} />
            }
          />
        );
      })}
    </List>
  ) : (
    <Grid isLoading={isLoading} searchBarPlaceholder={"Search images"}>
      <PlaceholderEmptyView layout={preferences.layout} />

      {picsumImages.map((value) => {
        return (
          <Grid.Item
            key={value.url}
            content={value.download_url}
            title={value.author}
            actions={
              <ActionOnPlaceholderImage picsumImage={value} preferences={preferences} page={page} setPage={setPage} />
            }
          />
        );
      })}
    </Grid>
  );
}
