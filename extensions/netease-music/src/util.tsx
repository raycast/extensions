import NeteaseMusicController, { NeteaseMusic } from "@chyroc/netease-music-controller";
import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function ensureAppRunning(): Promise<void> {
  let needsLaunch = false;
  try {
    const state = await NeteaseMusicController.getPlayState();
    needsLaunch = state === NeteaseMusic.PlayState.Exit;
  } catch {
    // App is not running (process killed or other error)
    needsLaunch = true;
  }

  if (needsLaunch) {
    await execAsync("open -a 'NeteaseMusic'");
    // Wait for the app to be fully ready (retry until menu bar is accessible)
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        await NeteaseMusicController.getPlayState();
        return; // App is ready
      } catch {
        // App not ready yet, continue waiting
      }
    }
  }
}

export async function controlMusic(f: () => Promise<void>) {
  try {
    await ensureAppRunning();
    await f();
    await showHUD("✅ success");
  } catch (e) {
    await showHUD(`❌ ${e}`);
  }
}
