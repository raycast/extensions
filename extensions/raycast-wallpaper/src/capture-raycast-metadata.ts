import { exec } from "child_process";
import { homedir } from "os";
import { runAppleScript } from "run-applescript";
import { checkDirectoryExists, isEmpty, preferences } from "./utils/common-utils";
import { Alert, confirmAlert, open, showHUD, showToast, Toast } from "@raycast/api";

export default async () => {
  const _raycastLocation = await getRaycastLocation();
  const _raycastSize = await getRaycastSize();
  const optionsAlert: Alert.Options = {
    title: "⚠️ Capture Failure!",
    message: "Files or folders already exist in the destination path. Do you want to overwrite?",
  };

  if (_raycastLocation[0] === -1) {
    optionsAlert.message = "Raycast main window not found!";
    await confirmAlert(optionsAlert);
    return;
  } else {
    if (_raycastSize[0] / _raycastSize[1] != 750 / 474) {
      optionsAlert.message = "Please close other Raycast windows and open Raycast main window only!";
      await confirmAlert(optionsAlert);
    } else {
      const captureResult = await captureRaycastMetadata(
        { x: _raycastLocation[0], y: _raycastLocation[1] },
        await getScreenResolution()
      );
      const currentTime = new Date().getTime();
      while (new Date().getTime() - currentTime < 100) {
        //To prevent capture success toast from overwriting the toast the user wants to show
        // wait for 1 second
      }
      await captureResultToast(captureResult);
    }
  }
};

async function captureResultToast(captureResult: CaptureResult) {
  if (captureResult.captureSuccess) {
    const optionsToast: Toast.Options = {
      title: "Capture Success!",
      style: Toast.Style.Success,
      message: "Screenshot saved in Download folder.",
      primaryAction: {
        title: "Open in Finder",
        onAction: async () => {
          await open(captureResult.picturePath);
          await showHUD("Open Screenshot in default app");
        },
      },
      secondaryAction: {
        title: "Reveal in Finder",
        onAction: async () => {
          await open(homedir() + "/Downloads/");
          await showHUD("Reveal Screenshot in Finder");
        },
      },
    };
    await showToast(optionsToast);
  } else {
    await showToast({
      title: "Capture Failure!",
      style: Toast.Style.Failure,
      message: captureResult.errorMassage,
    });
  }
}

type CaptureResult = {
  captureSuccess: boolean;
  picturePath: string;
  errorMassage: string;
};

type Resolution = {
  //显示器分辨率
  realWidth: number;
  realHeight: number;
  //显示分辨率（Mac 截图以此分辨率截图）
  viewWidth: number;
  viewHeight: number;
};

type RaycastLocation = {
  x: number;
  y: number;
};

async function getRaycastLocation() {
  const script = `
tell application "System Events"
    tell process "Raycast"
        set b to position of back window  
    end tell
end tell`;
  try {
    const result = await runAppleScript(script);
    const raycastLocation = result.split(", ");
    return [parseInt(raycastLocation[0]), parseInt(raycastLocation[1])];
  } catch (e) {
    return [-1, -1];
  }
}
async function getRaycastSize() {
  const script = `
tell application "System Events"
    tell process "Raycast"
        set b to size of back window  
    end tell
end tell`;
  try {
    const result = await runAppleScript(script);
    const raycastSize = result.split(", ");
    return [parseInt(raycastSize[0]), parseInt(raycastSize[1])];
  } catch (e) {
    return [-1, -1];
  }
}

async function getScreenResolution(): Promise<Resolution> {
  const script = `set screenWidth to (do shell script "/usr/sbin/system_profiler SPDisplaysDataType | awk '/Resolution/{print $2, $4} /UI Looks like/{print $4, $6}'")
return screenWidth`;
  const resolution = (await runAppleScript(script)).replace("\r", " ").split(" ");
  return {
    realWidth: parseInt(resolution[0]),
    realHeight: parseInt(resolution[1]),
    viewWidth: parseInt(resolution[2]),
    viewHeight: parseInt(resolution[3]),
  };
}

async function captureRaycastMetadata(raycastLocation: RaycastLocation, resolution: Resolution) {
  try {
    const { screenshotName, screenshotFormat } = preferences();
    const finalScreenshotName = isEmpty(screenshotName) ? "Metadata" : screenshotName;

    const picturePath = `${homedir()}/Downloads/${await createFileName(
      `${homedir()}/Downloads/`,
      finalScreenshotName,
      screenshotFormat
    )}`;
    const viewX = `${raycastLocation.x - 250 / (resolution.realWidth / resolution.viewWidth)}`;
    const viewY = `${raycastLocation.y - 150 / (resolution.realHeight / resolution.viewHeight)}`;
    const viewW = `${2000 * (resolution.viewWidth / resolution.realWidth)}`;
    const viewH = `${1250 * (resolution.viewHeight / resolution.realHeight)}`;
    const command = `/usr/sbin/screencapture -x -t ${screenshotFormat} -R ${viewX},${viewY},${viewW},${viewH} ${picturePath}`;
    exec(command);
    return { captureSuccess: true, picturePath: picturePath, errorMassage: "" };
  } catch (e) {
    console.error(String(e));
    return { captureSuccess: false, picturePath: homedir() + "/Downloads/", errorMassage: String(e) };
  }
}

export async function createFileName(path: string, name: string, extension: string) {
  const directoryExists = await checkDirectoryExists(path + name + "." + extension);
  if (!directoryExists) {
    return name + "." + extension;
  } else {
    let index = 2;
    while (directoryExists) {
      const newName = name + "-" + index + "." + extension;
      const directoryExists = await checkDirectoryExists(path + newName);
      if (!directoryExists) {
        return newName;
      }
      index++;
    }
    const date = new Date();
    const time =
      date.getFullYear() +
      "" +
      (date.getMonth() + 1) +
      "" +
      date.getDate() +
      "" +
      date.getHours() +
      "" +
      date.getMinutes() +
      "" +
      date.getSeconds();
    return name + "-" + time + "." + extension;
  }
}
