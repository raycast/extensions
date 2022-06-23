import { Grid } from "@raycast/api";
import React, { useState } from "react";
import { BingImage, DownloadedBingImage } from "../types/types";
import { WallpaperTag, wallpaperTags } from "../utils/constants";
import { ListEmptyView } from "./list-empty-view";
import { buildBingImageURL, getPictureName } from "../utils/bing-wallpaper-utils";
import { ActionsOnlineBingWallpaper } from "./actions-online-bing-wallpaper";
import { ActionsDownloadedBingWallpaper } from "./actions-downloaded-bing-wallpaper";
import { Preferences } from "../types/preferences";

export function WallpaperGridLayout(props: {
  preferences: Preferences;
  isLoading: boolean;
  bingWallpaperHD: BingImage[];
  downloadedBingWallpapers: DownloadedBingImage[];
}) {
  const [tag, setTag] = useState<string>("");
  const { preferences, isLoading, bingWallpaperHD, downloadedBingWallpapers } = props;
  return (
    <Grid
      isLoading={isLoading}
      itemSize={preferences.itemSize as Grid.ItemSize}
      searchBarPlaceholder={"Search wallpapers"}
      searchBarAccessory={
        preferences.includeDownloadedWallpapers ? (
          <Grid.Dropdown onChange={setTag} tooltip={"Wallpaper type"} storeValue={true}>
            {wallpaperTags.map((value, index) => {
              return <Grid.Dropdown.Item key={index + "_" + value[0]} title={value[1]} value={value[1]} />;
            })}
          </Grid.Dropdown>
        ) : null
      }
    >
      <ListEmptyView layout={preferences.layout} />
      {(tag === WallpaperTag.ALL || tag === WallpaperTag.ONLINE || tag === "") && (
        <Grid.Section title={"Online Wallpapers"}>
          {bingWallpaperHD.map((bingImage, index) => {
            return (
              <Grid.Item
                id={index + bingImage.url}
                key={index + bingImage.startdate}
                content={{
                  value: buildBingImageURL(bingImage.url, "icon", 960, 540),
                  tooltip: bingImage.title + "\n" + bingImage.copyright,
                }}
                title={getPictureName(bingImage.url)}
                actions={
                  <ActionsOnlineBingWallpaper
                    index={index}
                    bingImage={bingImage}
                    onlineImages={bingWallpaperHD}
                    downloadedImages={downloadedBingWallpapers}
                    downloadSize={preferences.downloadSize}
                  />
                }
              />
            );
          })}
        </Grid.Section>
      )}
      {preferences.includeDownloadedWallpapers && (tag === WallpaperTag.ALL || tag === WallpaperTag.DOWNLOADED) && (
        <Grid.Section title={"Downloaded Wallpapers"}>
          {downloadedBingWallpapers?.map((bingImage, index) => {
            return (
              <Grid.Item
                id={index + bingImage.name}
                key={index + bingImage.name}
                content={{ source: bingImage.path }}
                title={bingImage.name}
                actions={
                  <ActionsDownloadedBingWallpaper
                    index={index}
                    bingImage={bingImage}
                    onlineImages={bingWallpaperHD}
                    downloadedImages={downloadedBingWallpapers}
                  />
                }
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
