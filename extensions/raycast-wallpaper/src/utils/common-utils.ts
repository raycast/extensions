import { Cache, environment, getPreferenceValues, open, showInFinder, showToast, Toast } from "@raycast/api";
import fse, { existsSync } from "fs-extra";
import { homedir } from "os";
import { Preferences } from "../types/preferences";
import { RaycastWallpaper, RaycastWallpaperWithInfo } from "../types/types";
import axios from "axios";
import { runAppleScript } from "@raycast/utils";

export const cache = new Cache();
export const cachePath = environment.supportPath;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getThumbnailUrl = (url: string) => {
  // TODO: Hacky way to get the thumbnail URLs for the new wallpapers, replace them for optimized thumbnails
  const fileName = url.split("wallpapers/")[1];
  if (fileName.includes("_")) {
    return url.replace(`.${getFileType(url)}`, "_preview.png");
  }

  return url.replace(`.${getFileType(url)}`, "-thumbnail.webp");
};

export const getPreviewUrl = (url: string) => {
  const fileName = url.split("wallpapers/")[1];
  if (fileName.includes("_")) {
    return url.replace(`.${getFileType(url)}`, "_preview.png");
  }

  return url.replace(`.${getFileType(url)}`, "-preview.png");
};

export const getSavedDirectory = () => {
  const directoryPreference = getPreferenceValues<Preferences>().picturesDirectory;
  let actualDirectory = directoryPreference;
  if (directoryPreference.startsWith("~")) {
    actualDirectory = directoryPreference.replace("~", `${homedir()}`);
  }
  if (isEmpty(actualDirectory) || !fse.pathExistsSync(actualDirectory)) {
    return homedir() + "/Downloads";
  }
  return actualDirectory.endsWith("/") ? actualDirectory.substring(0, -1) : actualDirectory;
};

const getFileType = (url: string) => {
  return url.split(".").pop() || "png";
};

export const axiosGetImageArrayBuffer = async (url: string) => {
  const res = await axios({
    url: url,
    method: "GET",
    responseType: "arraybuffer",
  });
  return res.data;
};

export async function downloadPicture(wallpaper: { title: string; url: string }) {
  await showToast(Toast.Style.Animated, "Downloading...");

  const picturePath = `${getSavedDirectory()}/${wallpaper.title}.${getFileType(wallpaper.url)}`;
  fse.writeFile(picturePath, Buffer.from(await axiosGetImageArrayBuffer(wallpaper.url)), async (error) => {
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
}

export const setWallpaper = async (wallpaper: RaycastWallpaperWithInfo) => {
  const toast = await showToast(Toast.Style.Animated, "Downloading and setting wallpaper...");

  const { applyTo } = getPreferenceValues<Preferences>();
  const fixedPathName = buildCachePath(wallpaper);

  try {
    const actualPath = fixedPathName;

    if (!existsSync(actualPath)) {
      await cachePicture(wallpaper);
    }

    const result = await runAppleScript(`
      set temp_folder to (POSIX path of "${actualPath}")
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

export const autoSetWallpaper = async (wallpaper: RaycastWallpaper) => {
  const { applyTo } = getPreferenceValues<Preferences>();
  const fixedPathName = buildCachePath(wallpaper);

  try {
    const actualPath = fixedPathName;

    if (!existsSync(actualPath)) {
      await cachePicture(wallpaper);
    }

    const result = await runAppleScript(`
      set temp_folder to (POSIX path of "${actualPath}")
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
  } catch (err) {
    console.error(err);
  }
};

export const buildCachePath = (raycastWallpaper: RaycastWallpaper) => {
  const fileType = getFileType(raycastWallpaper.url);
  const normalizedCachePath = cachePath.endsWith("/") ? cachePath : `${cachePath}/`;
  return `${normalizedCachePath}${raycastWallpaper.title}.${fileType}`;
};

export const checkCache = (wallpaper: RaycastWallpaper) => {
  const fixedPath = buildCachePath(wallpaper);
  return fse.pathExistsSync(fixedPath);
};

export async function cachePicture(wallpaper: RaycastWallpaper) {
  const picturePath = buildCachePath(wallpaper);
  await fse.writeFile(picturePath, Buffer.from(await axiosGetImageArrayBuffer(wallpaper.url)));
}

export function deleteCache() {
  const pathName = environment.supportPath;
  if (fse.existsSync(pathName)) {
    const files = fse.readdirSync(pathName);
    files.forEach(function (file) {
      const curPath = pathName + "/" + file;
      fse.removeSync(curPath);
    });
  }
}
