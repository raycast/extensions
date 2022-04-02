import { Action, ActionPanel, Icon, List, showToast, Toast, open, showHUD } from "@raycast/api";
import {
  BingImage,
  BingResponseData,
  buildBingImageURL,
  buildBingWallpapersURL,
  buildCopyrightURL,
  buildTime,
  getCopyright,
  getPictureName,
} from "./bing-wallpaper-utils";
import React, { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import * as fs from "fs";
import { homedir } from "os";
import { deleteCache, preferences, setWallpaper } from "./utils";

export default function CommonDirectory() {
  const [bingWallpaperHD, setBingWallpaperHD] = useState<BingImage[]>([]);
  const { downloadSize } = preferences();

  useEffect(() => {
    async function _fetchWallpaper() {
      try {
        fetch(buildBingWallpapersURL(0, 8))
          .then((first_res) => first_res.json())
          .then((first_data) => {
            fetch(buildBingWallpapersURL(8, 8))
              .then((second_res) => second_res.json())
              .then((second_data) => {
                //Remove duplicate elements
                (second_data as BingResponseData).images.shift();
                const _bingWallpaperHD = (first_data as BingResponseData).images.concat(
                  (second_data as BingResponseData).images
                );
                // const _bingWallpaperHD = [...new Set(bingWallpaperHD.concat()];
                setBingWallpaperHD(_bingWallpaperHD);
              });
          });
      } catch (e) {
        if (e instanceof AbortError) {
          return;
        }
        await showToast(Toast.Style.Failure, String(e));
      }
    }

    _fetchWallpaper().then();
  }, []);

  return (
    <List isShowingDetail={true} isLoading={bingWallpaperHD.length === 0} searchBarPlaceholder={"Search WallPaper"}>
      {bingWallpaperHD?.map((bingImage, index) => {
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
## ${getCopyright(bingImage.copyright).story}
${getCopyright(bingImage.copyright).copyright}`}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Download}
                  title={"Download Picture"}
                  onAction={async () => {
                    await downloadPicture(downloadSize, bingImage);
                  }}
                />
                <Action
                  icon={Icon.Globe}
                  title={"Search Picture"}
                  onAction={async () => {
                    await open(buildCopyrightURL(bingImage.copyrightlink));
                    await showHUD("Search picture in browser");
                  }}
                />
                <Action
                  icon={Icon.Desktop}
                  title={"Set Desktop Wallpaper"}
                  shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
                  onAction={() => {
                    setWallpaper(
                      getPictureName(bingImage.url) + "-" + bingImage.startdate,
                      buildBingImageURL(bingImage.url, "raw")
                    ).then(() => "");
                  }}
                />
                <Action
                  icon={Icon.Trash}
                  title={"Clear Wallpaper Cache"}
                  shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
                  onAction={async () => {
                    deleteCache();
                    await showToast(Toast.Style.Success, "Clear cache success!");
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

async function downloadPicture(downSize: string, bingImage: BingImage) {
  await showToast(Toast.Style.Animated, "Downloading...");
  fetch(buildBingImageURL(bingImage.url, downSize))
    .then(function (res) {
      return res.arrayBuffer();
    })
    .then(function (buffer) {
      const picturePath = `${homedir()}/Downloads/${getPictureName(bingImage.url)}-${bingImage.startdate}.png`;
      fs.writeFile(picturePath, Buffer.from(buffer), async (error) => {
        if (error != null) {
          await showToast(Toast.Style.Failure, String(error));
        } else {
          const options: Toast.Options = {
            style: Toast.Style.Success,
            title: "Download picture success!",
            message: "Click to open picture",
            primaryAction: {
              title: "Open picture",
              onAction: (toast) => {
                open(picturePath);
                toast.hide();
              },
            },
            secondaryAction: {
              title: "Reveal in finder",
              onAction: (toast) => {
                open(`${homedir()}/Downloads`);
                toast.hide();
              },
            },
          };
          await showToast(options);
        }
      });
    });
}
