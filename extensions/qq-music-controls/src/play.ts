import { buildScriptEnsuringQQMusicIsRunning, runAppleScriptSilently } from "./utils";
export default async () => {
  const script = buildScriptEnsuringQQMusicIsRunning(
    `tell menu "播放控制" of menu bar item "播放控制" of menu bar 1
      click menu item "播放"
    end tell`,
  );

  try {
    await runAppleScriptSilently(script);
  } catch {
    console.log("Already playing");
  }
};
