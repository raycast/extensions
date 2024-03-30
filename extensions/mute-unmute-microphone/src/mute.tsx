import { Cache, popToRoot, closeMainWindow, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const cache = new Cache({
  namespace: "mic",
});

function closeAndUpdate() {
  launchCommand({ name: "show-mic", type: LaunchType.Background });
  popToRoot();
  closeMainWindow();
}

export async function unMute() {
  await runAppleScript(`tell application "System Events" to set volume input volume 100`);
  cache.set("inputVolume", "100");
  closeAndUpdate();
  await showToast({ title: "Set input volume to 100%", style: Toast.Style.Success });
}

export async function toggle() {
  await runAppleScript(`
  set inputVolume to input volume of (get volume settings)
if inputVolume = 0 then
    set inputVolume to 100
else
    set inputVolume to 0
end if
set volume input volume inputVolume`);
  const getVolume = await runAppleScript(`get input volume of (get volume settings)`);
  cache.set("inputVolume", getVolume);
  closeAndUpdate();
  await showToast({ title: `Set input volume to ${getVolume}%`, style: Toast.Style.Success });
}

async function mute() {
  await runAppleScript(`tell application "System Events" to set volume input volume 0`);
  cache.set("inputVolume", "0");
  closeAndUpdate();

  await showToast({ title: "Set input volume to 0%", style: Toast.Style.Success });
}
export default function Command() {
  return mute();
}
