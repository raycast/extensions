import { List } from "@raycast/api";
import React, { useState } from "react";
import { BingImage, DownloadedBingImage } from "../types/types";
import { WallpaperTag, wallpaperTags } from "../utils/constants";
import { ListEmptyView } from "./list-empty-view";
import { buildBingImageURL, getPictureName } from "../utils/bing-wallpaper-utils";
import { ActionsOnlineBingWallpaper } from "./actions-online-bing-wallpaper";
import fileUrl from "file-url";
import { ActionsDownloadedBingWallpaper } from "./actions-downloaded-bing-wallpaper";
import { includeDownloadedWallpapers, layout } from "../types/preferences";

export function WallpaperListLayout(props: {
  isLoading: boolean;
  bingWallpaperHD: BingImage[];
  downloadedBingWallpapers: DownloadedBingImage[];
}) {
  const [tag, setTag] = useState<string>("");
  const { isLoading, bingWallpaperHD, downloadedBingWallpapers } = props;
  return (
    <List
      isShowingDetail={bingWallpaperHD.length !== 0 && !isLoading}
      isLoading={isLoading}
      searchBarPlaceholder={"Search wallpapers"}
      searchBarAccessory={
        includeDownloadedWallpapers ? (
          <List.Dropdown onChange={setTag} tooltip={"Wallpaper type"} storeValue={true}>
            {wallpaperTags.map((value, index) => {
              return <List.Dropdown.Item key={index + "_" + value[0]} title={value[1]} value={value[1]} />;
            })}
          </List.Dropdown>
        ) : null
      }
    >
      <ListEmptyView layout={layout} />
      {(tag === WallpaperTag.ALL || tag === WallpaperTag.ONLINE || tag === "") && (
        <List.Section title={"Online Wallpapers"}>
          {bingWallpaperHD.map((bingImage, index) => {
            return (
              <List.Item
                id={index + bingImage.url}
                key={index + bingImage.startdate}
                icon={{ source: buildBingImageURL(bingImage.url, "icon", 64, 36) }}
                title={getPictureName(bingImage.url)}
                detail={
                  <List.Item.Detail
                    isLoading={false}
                    markdown={`![](${buildBingImageURL(bingImage.url, "icon", 960, 540)})
                    
## ${bingImage.title}

${bingImage.copyright}`}
                  />
                }
                actions={
                  <ActionsOnlineBingWallpaper
                    index={index}
                    bingImage={bingImage}
                    downloadedImages={downloadedBingWallpapers}
                    onlineImages={bingWallpaperHD}
                  />
                }
              />
            );
          })}
        </List.Section>
      )}
      {includeDownloadedWallpapers && (tag === WallpaperTag.ALL || tag === WallpaperTag.DOWNLOADED) && (
        <List.Section title={"Downloaded Wallpapers"}>
          {downloadedBingWallpapers?.map((bingImage, index) => {
            return (
              <List.Item
                id={index + bingImage.name}
                key={index + bingImage.name}
                icon={{ source: bingImage.path }}
                title={bingImage.name}
                detail={
                  <List.Item.Detail
                    isLoading={false}
                    markdown={`<img src="${fileUrl(bingImage.path)}" alt="${bingImage.name}" height="270" />`}
                  />
                }
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
        </List.Section>
      )}
    </List>
  );
}
