import { showToast, Toast, environment, getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, unlinkSync } from "fs";
import { resolveHome } from "./utils";

const execFileP = promisify(execFile);

interface SetWallpaperProps {
  url: string;
  id: string;
  every?: boolean;
  useHud?: boolean;
  isBackground?: boolean;
}

const displayMessage = async (msg: string, type: "hud" | "toast") => {
  if (type === "hud") await showHUD(msg);
  else return await showToast(Toast.Style.Animated, msg);
};

async function setWallpaperWindows(imagePath: string) {
  const ps = `$c=@"
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll",CharSet=CharSet.Auto)]
  public static extern int SystemParametersInfo(int a,int b,string c,int d);
}
"@
Add-Type -TypeDefinition $c
$r = [W]::SystemParametersInfo(20,0,'${imagePath.replace(/'/g, "''")}',3)
if ($r -eq 0) { throw "SystemParametersInfo returned 0" }`;
  const encoded = Buffer.from(ps, "utf16le").toString("base64");
  await execFileP("powershell", ["-NoProfile", "-EncodedCommand", encoded]);
}

export const setWallpaper = async ({ url, id, every, useHud = false, isBackground = false }: SetWallpaperProps) => {
  const { downloadSize, wallpaperPath } = getPreferenceValues<Preferences>();
  const selectedPath = resolveHome(wallpaperPath || environment.supportPath);

  let toast;

  if (!isBackground) {
    if (existsSync(selectedPath)) {
      toast = await displayMessage("Downloading and setting wallpaper...", useHud ? "hud" : "toast");
    } else {
      toast = await displayMessage(
        "The selected path does not exist. Please select a valid path.",
        useHud ? "hud" : "toast",
      );
    }
  }

  const fixedPathName = selectedPath.endsWith("/")
    ? `${selectedPath}${id}-${downloadSize}.jpg`
    : `${selectedPath}/${id}-${downloadSize}.jpg`;

  try {
    if (process.platform === "win32") {
      // Windows: SPI sets wallpaper on all monitors; `every` is always true
      if (!existsSync(fixedPathName)) {
        try {
          await execFileP("curl.exe", ["-s", "--fail", "-o", fixedPathName, url]);
        } catch (err) {
          try {
            unlinkSync(fixedPathName);
          } catch {
            // ignore cleanup error
          }
          throw err;
        }
      }
      await setWallpaperWindows(fixedPathName);
      if (useHud) {
        if (!isBackground) await showHUD("Wallpaper set!");
      } else if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "Wallpaper set!";
      }
      return true;
    }

    const actualPath = fixedPathName;

    const command = !existsSync(actualPath)
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
          tell ${every ? "every" : "current"} desktop
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
    else if (useHud) {
      if (!isBackground) await showHUD("Wallpaper set!");
    } else if (toast) {
      toast.style = Toast.Style.Success;
      toast.title = "Wallpaper set!";
    }
    return true;
  } catch (err) {
    console.error(err);

    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with another image or check your internet connection.";
    }
    return false;
  }
};

export default setWallpaper;
