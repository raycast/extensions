import { getPreferenceValues, List } from "@raycast/api";
import { buildBingImageURL, getPictureName } from "./utils/bing-wallpaper-utils";
import React, { useState } from "react";
import { Preferences } from "./types/preferences";
import { ActionsOnlineBingWallpaper } from "./components/actions-online-bing-wallpaper";
import { ActionsDownloadedBingWallpaper } from "./components/actions-downloaded-bing-wallpaper";
import fileUrl from "file-url";
import { autoDownloadWallpapers, getBingWallpapers } from "./hooks/hooks";
import { WallpaperTag, wallpaperTags } from "./utils/constants";
import { ListEmptyView } from "./components/list-empty-view";

export default function CommonDirectory() {
  const { downloadSize, includeDownloadedWallpapers } = getPreferenceValues<Preferences>();
  const [wallpaperTag, setWallpaperTag] = useState<string>("");

  const { bingWallpaperHD, downloadedBingWallpapers, isLoading } = getBingWallpapers(includeDownloadedWallpapers);
  autoDownloadWallpapers(bingWallpaperHD);

  return (
    <List
      isShowingDetail={bingWallpaperHD.length !== 0 && !isLoading}
      isLoading={isLoading}
      searchBarPlaceholder={"Search wallpapers"}
      searchBarAccessory={
        includeDownloadedWallpapers ? (
          <List.Dropdown onChange={setWallpaperTag} tooltip={"Wallpaper type"} storeValue={true}>
            {wallpaperTags.map((value, index) => {
              return <List.Dropdown.Item key={index + "_" + value[0]} title={value[1]} value={value[1]} />;
            })}
          </List.Dropdown>
        ) : null
      }
    >
      <ListEmptyView />
      {(wallpaperTag === WallpaperTag.ALL || wallpaperTag === WallpaperTag.ONLINE || wallpaperTag === "") && (
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
                    bingImage={bingImage}
                    bingImages={bingWallpaperHD}
                    downloadSize={downloadSize}
                  />
                }
              />
            );
          })}
        </List.Section>
      )}
      {includeDownloadedWallpapers && (wallpaperTag === WallpaperTag.ALL || wallpaperTag === WallpaperTag.DOWNLOADED) && (
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
                actions={<ActionsDownloadedBingWallpaper bingImage={bingImage} bingImages={downloadedBingWallpapers} />}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
