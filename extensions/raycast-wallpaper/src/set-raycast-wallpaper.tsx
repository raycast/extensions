import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  open,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { RaycastWallpaper, raycastWallpaperListURL } from "./utils/raycast-wallpaper-utils";
import React, { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import * as fs from "fs";
import { homedir } from "os";
import { buildCachePath, checkCache, deleteCache, getScreenshotsDirectory, setWallpaper } from "./utils/common-utils";
import fileUrl from "file-url";

export default function CommonDirectory() {
  const [raycastWallpaper, setRaycastWallpaper] = useState<RaycastWallpaper[]>([]);

  useEffect(() => {
    async function _fetchWallpaper() {
      //get wallpaper list
      try {
        fetch(raycastWallpaperListURL)
          .then((response) => response.json())
          .then((data) => {
            //cache wallpaper list
            const _raycastWallpaper = data as RaycastWallpaper[];
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
    <List isShowingDetail={true} isLoading={raycastWallpaper.length === 0} searchBarPlaceholder={"Search pictures"}>
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
                <ActionPanel.Section>
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
                  <Action
                    icon={Icon.Trash}
                    title={"Clear Pictures Cache"}
                    shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
                    onAction={async () => {
                      const options: Alert.Options = {
                        title: "Are you sure?",
                        message: "Next time you enter the command, the pictures will be re-cached.",
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
                </ActionPanel.Section>
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
      const picturePath = `${getScreenshotsDirectory()}/${wallpaper.title}.png`;
      fs.writeFile(picturePath, Buffer.from(buffer), async (error) => {
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
