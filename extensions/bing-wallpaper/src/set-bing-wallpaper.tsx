import { Action, ActionPanel, Icon, List, open, showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import {
  BingImage,
  BingResponseData,
  buildBingImageURL,
  buildBingWallpapersURL,
  buildCopyrightURL,
  getCopyright,
  getPictureName,
} from "./utils/bing-wallpaper-utils";
import React, { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { homedir } from "os";
import { deleteCache, getPicturesDirectory, preferences, setWallpaper } from "./utils/common-utils";
import fse from "fs-extra";

export default function CommonDirectory() {
  const [bingWallpaperHD, setBingWallpaperHD] = useState<BingImage[]>([]);
  const { downloadSize, autoDownload } = preferences();

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

  useEffect(() => {
    async function _downloadWallpaper() {
      try {
        //delete wallpaper Cache
        deleteCache();
        //auto download wallpaper
        if (autoDownload) {
          await autoDownloadPictures(downloadSize, bingWallpaperHD);
        }
      } catch (e) {
        console.error(String(e));
      }
    }

    _downloadWallpaper().then();
  }, [bingWallpaperHD]);

  return (
    <List isShowingDetail={true} isLoading={bingWallpaperHD.length === 0} searchBarPlaceholder={"Search wallpaper"}>
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
                  icon={Icon.Desktop}
                  title={"Set Desktop Wallpaper"}
                  onAction={() => {
                    setWallpaper(
                      getPictureName(bingImage.url) + "-" + bingImage.startdate,
                      buildBingImageURL(bingImage.url, "raw")
                    ).then(() => "");
                  }}
                />
                <Action
                  icon={Icon.Download}
                  title={"Download Picture"}
                  onAction={async () => {
                    await downloadPicture(downloadSize, bingImage);
                  }}
                />
                <ActionPanel.Section>
                  <Action
                    icon={Icon.TwoArrowsClockwise}
                    title={"Set Random Wallpaper"}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => {
                      const randomImage = bingWallpaperHD[Math.floor(Math.random() * bingWallpaperHD.length)];
                      setWallpaper(
                        getPictureName(randomImage.url) + "-" + randomImage.startdate,
                        buildBingImageURL(randomImage.url, "raw")
                      ).then(() => "");
                    }}
                  />
                  <Action
                    icon={Icon.MagnifyingGlass}
                    title={"Search Picture"}
                    shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
                    onAction={async () => {
                      await open(buildCopyrightURL(bingImage.copyrightlink));
                      await showHUD("Search picture in browser");
                    }}
                  />
                  <Action
                    icon={Icon.Globe}
                    title={"More Bing Wallpaper"}
                    shortcut={{ modifiers: ["shift", "cmd"], key: "m" }}
                    onAction={async () => {
                      await open("https://github.com/niumoo/bing-wallpaper");
                      await showHUD("Get more bing wallpaper");
                    }}
                  />
                </ActionPanel.Section>
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
      const picturePath = `${getPicturesDirectory()}/${getPictureName(bingImage.url)}-${
        bingImage.startdate
      }-${downSize}.png`;
      fse.writeFile(picturePath, Buffer.from(buffer), async (error) => {
        if (error != null) {
          await showToast(Toast.Style.Failure, String(error));
        } else {
          const options: Toast.Options = {
            style: Toast.Style.Success,
            title: "Download picture success!",
            message: `${picturePath.replace(`${homedir()}`, "~")}`,
            primaryAction: {
              title: "Open picture",
              onAction: (toast) => {
                open(picturePath);
                toast.hide();
              },
            },
            secondaryAction: {
              title: "Show in finder",
              onAction: (toast) => {
                showInFinder(picturePath);
                toast.hide();
              },
            },
          };
          await showToast(options);
        }
      });
    });
}

async function autoDownloadPictures(downSize: string, bingImages: BingImage[]) {
  bingImages.forEach((value) => {
    const picturePath = `${getPicturesDirectory()}/${getPictureName(value.url)}-${value.startdate}-${downSize}.png`;
    if (!fse.existsSync(picturePath)) {
      fetch(buildBingImageURL(value.url, downSize))
        .then(function (res) {
          return res.arrayBuffer();
        })
        .then(function (buffer) {
          fse.writeFile(picturePath, Buffer.from(buffer), async (error) => {
            if (error != null) {
              console.error(String(error));
            }
          });
        });
    }
  });
}
