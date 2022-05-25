import { environment, getPreferenceValues, open, showInFinder, showToast, Toast } from "@raycast/api";
import fse from "fs-extra";
import { runAppleScript } from "run-applescript";
import { homedir } from "os";
import { Preferences } from "../types/preferences";
import { BingImage, DownloadedBingImage } from "../types/types";
import fetch from "node-fetch";
import { buildBingImageURL, getPictureName } from "./bing-wallpaper-utils";
import { wallpaperImageExtension } from "./constants";
import { parse } from "path";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getPicturesDirectory = () => {
  const directoryPreference = getPreferenceValues<Preferences>().downloadDirectory;
  let actualDirectory = directoryPreference;
  if (directoryPreference.startsWith("~")) {
    actualDirectory = directoryPreference.replace("~", `${homedir()}`);
  }
  if (isEmpty(actualDirectory) || !fse.pathExistsSync(actualDirectory)) {
    return homedir() + "/Downloads";
  }
  return actualDirectory.endsWith("/") ? actualDirectory.substring(0, -1) : actualDirectory;
};

export const setWallpaper = async (title: string, url: string) => {
  const toast = await showToast(Toast.Style.Animated, "Downloading and setting wallpaper...");

  const { applyTo } = getPreferenceValues<Preferences>();
  const selectedPath = environment.supportPath;
  const fixedPathName = selectedPath.endsWith("/") ? `${selectedPath}${title}.png` : `${selectedPath}/${title}.png`;

  try {
    const actualPath = fixedPathName;

    const command = !fse.existsSync(actualPath)
      ? `set cmd to "curl -o " & q_temp_folder & " " & "${url}"
        do shell script cmd`
      : "";

    const result = await runAppleScript(`
      set temp_folder to (POSIX path of "${actualPath}")
      set q_temp_folder to quoted form of temp_folder

      ${command}

      set x to alias (POSIX file temp_folder)

      try
        tell application "System Events"
          tell ${applyTo} desktop
            set picture to (x as text)
            return "ok"
          end tell
        end tell
      on error
        set dialogTitle to "Error Setting Wallpaper"
        set dialogText to "Please make sure you have given Raycast the required permission. To make sure, click the button below and grant Raycast the 'System Events' permission."

        display alert dialogTitle message dialogText buttons {"Cancel", "Open Preferences"} default button 2 as informational
          if button returned of result is "Open Preferences" then
            do shell script "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation'"
          end if

        return "error"
      end try
    `);

    if (result !== "ok") throw new Error("Error setting wallpaper.");
    else if (toast) {
      toast.style = Toast.Style.Success;
      toast.title = "Set wallpaper successfully!";
    }
    fse.removeSync(actualPath);
  } catch (err) {
    console.error(err);

    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with another image or check your internet connection.";
    }
  }
};

export const setDownloadedWallpaper = async (path: string) => {
  const toast = await showToast(Toast.Style.Animated, "Setting wallpaper...");

  const { applyTo } = getPreferenceValues<Preferences>();

  try {
    const result = await runAppleScript(`
      set temp_folder to (POSIX path of "${path}")
      set q_temp_folder to quoted form of temp_folder
 

      set x to alias (POSIX file temp_folder)

      try
        tell application "System Events"
          tell ${applyTo} desktop
            set picture to (x as text)
            return "ok"
          end tell
        end tell
      on error
        set dialogTitle to "Error Setting Wallpaper"
        set dialogText to "Please make sure you have given Raycast the required permission. To make sure, click the button below and grant Raycast the 'System Events' permission."

        display alert dialogTitle message dialogText buttons {"Cancel", "Open Preferences"} default button 2 as informational
          if button returned of result is "Open Preferences" then
            do shell script "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation'"
          end if

        return "error"
      end try
    `);

    if (result !== "ok") throw new Error("Error setting wallpaper.");
    else if (toast) {
      toast.style = Toast.Style.Success;
      toast.title = "Set wallpaper successfully!";
    }
  } catch (err) {
    console.error(err);

    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with another image or check your internet connection.";
    }
  }
};

export async function downloadPicture(downSize: string, bingImage: BingImage) {
  await showToast(Toast.Style.Animated, "Downloading...");
  fetch(buildBingImageURL(bingImage.url, downSize))
    .then(function (res) {
      return res.arrayBuffer();
    })
    .then(function (buffer) {
      const picturePath = `${getPicturesDirectory()}/${getPictureName(bingImage.url)}-${bingImage.startdate}.png`;
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

export async function autoDownloadPictures(downSize: string, bingImages: BingImage[]) {
  bingImages.forEach((value) => {
    const picturePath = `${getPicturesDirectory()}/${getPictureName(value.url)}-${value.startdate}.png`;
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

export function getDownloadedBingWallpapers() {
  const imageFolderPath = getPicturesDirectory();
  const files = fse.readdirSync(imageFolderPath);
  const downloadedWallpapers: DownloadedBingImage[] = [];
  files.forEach((value) => {
    if (wallpaperImageExtension.includes(parse(value).ext) && !value.startsWith(".")) {
      downloadedWallpapers.push({ name: parse(value).name, path: imageFolderPath + "/" + value });
    }
  });
  return downloadedWallpapers;
}
