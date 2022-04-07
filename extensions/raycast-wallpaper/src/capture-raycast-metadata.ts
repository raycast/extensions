import { exec } from "child_process";
import { homedir } from "os";
import { runAppleScript } from "run-applescript";

export default async () => {
  const _raycastLocation = await getRaycastLocation();
  const _raycastSize = await getRaycastSize();
  if (_raycastLocation[0] === -1) {
    await showNotification("Capture Error!", "Raycast not found!", "Funk");
    return;
  } else {
    if (_raycastSize[0] / _raycastSize[1] != 750 / 474) {
      await showNotification("Capture Error!", "Please close other Raycast windows!", "Funk");
    } else {
      await captureRaycastMetadata({ x: _raycastLocation[0], y: _raycastLocation[1] }, await getScreenResolution());
      await showNotification("Capture Success!", "Image are saved in Download folder.");
    }
  }
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
  const picturePath = `${homedir()}/Downloads/${createPictureName()}.png`;
  const viewX = `${raycastLocation.x - 250 / (resolution.realWidth / resolution.viewWidth)}`;
  const viewY = `${raycastLocation.y - 150 / (resolution.realHeight / resolution.viewHeight)}`;
  const viewW = `${2000 * (resolution.viewWidth / resolution.realWidth)}`;
  const viewH = `${1250 * (resolution.viewHeight / resolution.realHeight)}`;
  const command = `/usr/sbin/screencapture -x -R ${viewX},${viewY},${viewW},${viewH} ${picturePath}`;
  exec(command, {});
}

function createPictureName() {
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

  return "Raycast-" + time;
}

async function showNotification(title: string, message: string, sound = "Frog") {
  const script = `display notification "${message}" with title "${title}" sound name "${sound}"`;
  try {
    await runAppleScript(script);
  } catch (e) {
    return [-1, -1];
  }
}
