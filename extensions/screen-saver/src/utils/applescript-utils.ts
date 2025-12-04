import { spawnSync } from "child_process";

export const activateScreenSaver = async () => {
  try {
    spawnSync("open -a ScreenSaverEngine", { shell: true });
    return { success: true, message: "Screen Saver Activated" };
  } catch (e) {
    console.error(String(e));
    return { success: false, message: String(e) };
  }
};
