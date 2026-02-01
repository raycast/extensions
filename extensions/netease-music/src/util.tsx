import NeteaseMusicController, { NeteaseMusic } from "@chyroc/netease-music-controller";
import { showHUD } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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
    await execFileAsync("open", ["-a", "NeteaseMusic"]);
    // Wait for the app to be fully ready (retry until menu bar is accessible)
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const state = await NeteaseMusicController.getPlayState();
        if (state !== NeteaseMusic.PlayState.Exit) {
          return; // App is ready
        }
        // State is still Exit; continue waiting
      } catch {
        // App not ready yet, continue waiting
      }
    }
    throw new Error("Timed out waiting for NeteaseMusic to be ready");
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
