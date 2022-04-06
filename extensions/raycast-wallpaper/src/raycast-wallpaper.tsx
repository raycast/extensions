import { Action, ActionPanel, Icon, List, open, showHUD, showToast, Toast } from "@raycast/api";
import { buildImageURL, raycastWallpaper } from "./utils/raycast-wallpaper-utils";
import React, { useEffect } from "react";
import fetch from "node-fetch";
import * as fs from "fs";
import { homedir } from "os";
import { buildCachePath, checkCache, setWallpaper } from "./utils/common-utils";
import fileUrl from "file-url";

export default function CommonDirectory() {
  useEffect(() => {
    async function _fetchWallpaper() {
      raycastWallpaper.forEach((value) => {
        if (!checkCache(value)) {
          cachePicture(value);
        }
      });
    }

    _fetchWallpaper().then();
  }, []);

  return (
    <List isShowingDetail={true} isLoading={false} searchBarPlaceholder={"Search WallPaper"}>
      {raycastWallpaper.map((value, index) => {
        return (
          <List.Item
            id={index + ""}
            key={index + value.title}
            icon={{ source: checkCache(value) ? buildCachePath(value) : buildImageURL(value.url) }}
            title={value.title}
            detail={
              <List.Item.Detail
                isLoading={false}
                markdown={`![](${checkCache(value) ? fileUrl(buildCachePath(value)) : buildImageURL(value.url)})`}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Desktop}
                  title={"Set Desktop Wallpaper"}
                  onAction={() => {
                    setWallpaper(value).then(() => "");
                  }}
                />
                <Action
                  icon={Icon.Download}
                  title={"Download Picture"}
                  onAction={async () => {
                    await downloadPicture(value);
                  }}
                />
                <Action
                  icon={Icon.TwoArrowsClockwise}
                  title={"Set Random Wallpaper"}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => {
                    const randomImage = raycastWallpaper[Math.floor(Math.random() * raycastWallpaper.length)];
                    setWallpaper(randomImage).then(() => "");
                  }}
                />
                <Action
                  icon={Icon.Globe}
                  title={"Go to Raycast Wallpaper"}
                  shortcut={{ modifiers: ["shift", "cmd"], key: "g" }}
                  onAction={async () => {
                    await open("https://www.raycast.com/wallpapers");
                    await showHUD("Go to Raycast Wallpaper");
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

async function downloadPicture(wallpaper: { title: string; url: string }) {
  await showToast(Toast.Style.Animated, "Downloading...");
  fetch(buildImageURL(wallpaper.url))
    .then(function (res) {
      return res.arrayBuffer();
    })
    .then(function (buffer) {
      const picturePath = `${homedir()}/Downloads/${wallpaper.title}.png`;
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

function cachePicture(wallpaper: { title: string; url: string }) {
  fetch(buildImageURL(wallpaper.url))
    .then(function (res) {
      return res.arrayBuffer();
    })
    .then(function (buffer) {
      const picturePath = buildCachePath(wallpaper);
      fs.writeFile(picturePath, Buffer.from(buffer), async (error) => {
        if (error != null) {
          console.log("error " + error);
        }
      });
    });
}
