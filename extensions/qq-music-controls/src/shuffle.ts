import play from "./play";
import { buildScriptEnsuringQQMusicIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringQQMusicIsRunning(
    `tell menu "播放控制" of menu bar item "播放控制" of menu bar 1
      click menu item 1 of menu 1 of menu item 7
    end tell`,
  );
  await runAppleScriptSilently(script);
  await play();
};
