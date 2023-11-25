import { spawnSync } from "child_process";

export const activateScreenSaver = async () => {
  try {
    spawnSync("open -a ScreenSaverEngine.app", { shell: true });
    return { success: true, message: "Screen saver activated" };
  } catch (e) {
    console.error(String(e));
    return { success: true, message: String(e) };
  }
};

export const activateRandomScreenSaver = async () => {
  try {
    const script = `tell application "System Events"
    set randomScreenSaver to screen saver "Random"
    start randomScreenSaver
end tell`;
    spawnSync("osascript", ["-e", script]);
    return { success: true, message: "Screen saver activated" };
  } catch (e) {
    console.error(String(e));
    return { success: true, message: String(e) };
  }
};
