import { useState } from "react";
import { Grid, Image, List } from "@raycast/api";
import usePlaceholderImages from "@/hooks/use-placeholder-images";
import { ActionOnPlaceholderImage } from "@/components/action-on-placeholder-image";
import { PlaceholderEmptyView } from "@/components/placeholder-empty-view";
import { columns, layout, perPage } from "@/utils/preferences";
import { buildGridContentImageURL, prefix } from "@/utils/urls";

export default function SearchPlaceholderImages() {
  const [page, setPage] = useState<number>(1);
  const { picsumImages, isLoading } = usePlaceholderImages(page, parseInt(perPage));

  return layout === "List" ? (
    <List
      isShowingDetail={picsumImages.length !== 0 && !isLoading}
      isLoading={isLoading}
      searchBarPlaceholder={"Search placeholders"}
    >
      <PlaceholderEmptyView layout={layout} />

      {picsumImages.map((value) => {
        return (
          <List.Item
            key={value.download_url}
            icon={{
              source: prefix + value.id + "/64/64",
              mask: Image.Mask.RoundedRectangle,
              fallback: { light: "picsum-icon.png", dark: "picsum-icon@dark.png" },
            }}
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
            actions={<ActionOnPlaceholderImage picsumImage={value} page={page} setPage={setPage} />}
          />
        );
      })}
    </List>
  ) : (
    <Grid columns={parseInt(columns)} isLoading={isLoading} searchBarPlaceholder={"Search placeholders"}>
      <PlaceholderEmptyView layout={layout} />

      {picsumImages.map((value) => {
        return (
          <Grid.Item
            key={value.download_url}
            content={{
              value: buildGridContentImageURL(parseInt(columns), value.id),
              tooltip: value.width + " ✕ " + value.height,
            }}
            title={value.author}
            actions={<ActionOnPlaceholderImage picsumImage={value} page={page} setPage={setPage} />}
          />
        );
      })}
    </Grid>
  );
}
