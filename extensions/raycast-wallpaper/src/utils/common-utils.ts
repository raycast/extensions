import { environment, getPreferenceValues, open, showInFinder, showToast, Toast } from "@raycast/api";
import fse, { existsSync } from "fs-extra";
import { runAppleScript } from "run-applescript";
import { homedir } from "os";
import { Preferences } from "../types/preferences";
import { RaycastWallpaper } from "../types/types";
import util from "util";
import { exec } from "child_process";
import fetch from "node-fetch";

export const cachePath = environment.supportPath;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getScreenshotsDirectory = () => {
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

export async function downloadPicture(wallpaper: { title: string; url: string }) {
  await showToast(Toast.Style.Animated, "Downloading...");
  fetch(wallpaper.url)
    .then(function (res) {
      return res.arrayBuffer();
    })
    .then(function (buffer) {
      const picturePath = `${getScreenshotsDirectory()}/${wallpaper.title}.png`;
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

export const setWallpaper = async (wallpaper: RaycastWallpaper) => {
  const toast = await showToast(Toast.Style.Animated, "Downloading and setting wallpaper...");

  const { applyTo } = getPreferenceValues<Preferences>();
  const fixedPathName = buildCachePath(wallpaper);

  try {
    const actualPath = fixedPathName;

    const command = !existsSync(actualPath)
      ? `set cmd to "curl -o " & q_temp_folder & " " & "${wallpaper.url}"
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
  } catch (err) {
    console.error(err);

    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with another image or check your internet connection.";
    }
  }
};

export const buildCachePath = (raycastWallpaper: RaycastWallpaper) => {
  return cachePath.endsWith("/")
    ? `${cachePath}${raycastWallpaper.title}.png`
    : `${cachePath}/${raycastWallpaper.title}.png`;
};

export const buildIconCachePath = (raycastWallpaper: RaycastWallpaper) => {
  const outputDir = (cachePath.endsWith("/") ? cachePath : cachePath + "/") + "icon-cache";
  return `${outputDir}/${raycastWallpaper.title}.png.png`;
};

export const checkCache = (wallpaper: RaycastWallpaper) => {
  const fixedPath = buildCachePath(wallpaper);
  return fse.pathExistsSync(fixedPath);
};

export const checkIconCache = (raycastWallpaper: RaycastWallpaper) => {
  return fse.pathExistsSync(buildIconCachePath(raycastWallpaper));
};

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

export function cachePicture(wallpaper: { title: string; url: string }) {
  fetch(wallpaper.url)
    .then(function (res) {
      return res.arrayBuffer();
    })
    .then(function (buffer) {
      const picturePath = buildCachePath(wallpaper);
      fse.writeFile(picturePath, Buffer.from(buffer), async (error) => {
        if (error != null) {
          console.error("error " + error);
        }
        await cacheIconPreview(wallpaper);
      });
    });
}

const execAsync = util.promisify(exec);

export const cacheIconPreview = async (raycastWallpaper: RaycastWallpaper) => {
  try {
    const outputDir = (cachePath.endsWith("/") ? cachePath : cachePath + "/") + "icon-cache";
    const filePath = buildCachePath(raycastWallpaper);

    if (!fse.pathExistsSync(outputDir)) {
      fse.mkdirSync(outputDir, { recursive: true });
    }

    await execAsync(`qlmanage -t -s 32 ${filePath.replaceAll(" ", `" "`)} -o ${outputDir.replaceAll(" ", `" "`)}`, {
      timeout: 500 /* milliseconds */,
      killSignal: "SIGKILL",
    });
  } catch (e) {
    console.error(String(e));
    return null;
  }
};
