import { Action, ActionPanel, Alert, confirmAlert, Icon, List, open, showHUD, showToast, Toast } from "@raycast/api";
import { HellonextWallpapers, hellonextWallpaperURL } from "./libs/hn-wallpaper";
import React, { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import * as fs from "fs";
import { homedir } from "os";
import { buildCachePath, checkCache, deleteCache, setWallpaper } from "./libs/utils";
import fileUrl from "file-url";

export default function CommonDirectory() {
  const [raycastWallpaper, setRaycastWallpaper] = useState<HellonextWallpapers[]>([]);

  useEffect(() => {
    async function _fetchWallpaper() {
      //get wallpaper list
      try {
        fetch(hellonextWallpaperURL)
          .then((first_res) => first_res.json())
          .then((first_data) => {
            //cache wallpaper list
            const _raycastWallpaper = first_data as HellonextWallpapers[];
            setRaycastWallpaper(_raycastWallpaper);
            _raycastWallpaper.forEach((value) => {
              if (!checkCache(value)) {
                cachePicture(value);
              }
            });
          });
      } catch (e) {
        if (e instanceof AbortError) {
          console.log("Abort");
        } else {
          console.log(e);
        }
        return;
      }
    }

    _fetchWallpaper().then();
  }, []);

  return (
    <List isShowingDetail={true} isLoading={raycastWallpaper.length === 0} searchBarPlaceholder={"Search wallpapers"}>
      {raycastWallpaper.map((value, index) => {
        return (
          <List.Item
            id={index + ""}
            key={index + value.title}
            icon={{ source: checkCache(value) ? buildCachePath(value) : value.url }}
            title={value.title}
            detail={
              <List.Item.Detail
                isLoading={false}
                markdown={`![](${checkCache(value) ? fileUrl(buildCachePath(value)) : value.url})`}
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
                  title={"Go to Hellonext Wallpapers"}
                  shortcut={{ modifiers: ["shift", "cmd"], key: "g" }}
                  onAction={async () => {
                    await open("https://hellonext.co/wallpaper");
                    await showHUD("Go to Hellonext Wallpapers");
                  }}
                />
                <Action
                  icon={Icon.Trash}
                  title={"Clear Wallpaper Cache"}
                  shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
                  onAction={async () => {
                    const options: Alert.Options = {
                      title: "Are you sure?",
                      message: "The next time the command is used, the images will be re-cached.",
                      primaryAction: {
                        title: "Confirm",
                        onAction: () => {
                          deleteCache();
                          showToast(Toast.Style.Success, "Clear cache success!");
                        },
                      },
                    };
                    await confirmAlert(options);
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
  fetch(wallpaper.url)
    .then(function (res) {
      return res.arrayBuffer();
    })
    .then(function (buffer) {
      const picturePath = `${homedir()}/Pictures/${wallpaper.title}.png`;
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
                open(`${homedir()}/Pictures`);
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
  fetch(wallpaper.url)
    .then(function (res) {
      return res.arrayBuffer();
    })
    .then(function (buffer) {
      const picturePath = buildCachePath(wallpaper);
      fs.writeFile(picturePath, Buffer.from(buffer), async (error) => {
        if (error != null) {
          console.error("error " + error);
        }
      });
    });
}
