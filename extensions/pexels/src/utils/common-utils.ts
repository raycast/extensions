import { environment, getPreferenceValues, open, showInFinder, showToast, Toast } from "@raycast/api";
import fse from "fs-extra";
import { runAppleScript } from "run-applescript";
import { homedir } from "os";
import fetch from "node-fetch";
import path from "path";
import Style = Toast.Style;
import { Preferences } from "../types/preferences";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getDownloadDirectory = () => {
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

// must original url
export const buildImageName = (url: string, downloadSize = "") => {
  const parsedPath = path.parse(url);
  return parsedPath.name + "-" + downloadSize + parsedPath.ext;
};

export async function downloadPhoto(url: string, name: string) {
  const toast = await showToast(Style.Animated, "Downloading...");
  const selectedPath = getDownloadDirectory();
  const filePath = selectedPath.endsWith("/") ? `${selectedPath}${name}` : `${selectedPath}/${name}`;
  const res = await fetch(url);
  const data = await res.arrayBuffer();
  fse.writeFileSync(filePath, Buffer.from(data));
  toast.title = "Success!";
  toast.message = filePath;
  toast.style = Style.Success;
  toast.primaryAction = {
    title: "Open Photo",
    onAction: () => {
      open(filePath);
    },
  };
  toast.secondaryAction = {
    title: "Show in Finder",
    onAction: () => {
      showInFinder(filePath);
    },
  };
}

export const setWallpaper = async (url: string) => {
  const toast = await showToast(Toast.Style.Animated, "Downloading and setting wallpaper...");
  const title = buildImageName(url);

  const { applyTo } = getPreferenceValues<Preferences>();
  const selectedPath = environment.supportPath;
  const fixedPathName = selectedPath.endsWith("/") ? `${selectedPath}${title}` : `${selectedPath}/${title}`;

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
      toast.title = "Set wallpaper success!";
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
