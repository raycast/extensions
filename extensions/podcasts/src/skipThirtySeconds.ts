import { buildPodcastScript, runAppleScriptAndCloseWindow } from "./utils";

export default async () => {
  const playScript = `key code 124 using {shift down, command down}`; // shift, command, right arrow
  const script = buildPodcastScript(playScript);
  await runAppleScriptAndCloseWindow(script);
};
