import { buildPodcastScript, runAppleScriptAndCloseWindow } from "./utils";

export default async () => {
  const playScript = `key code 123 using {shift down, command down}`; // shift, command, left arrow
  const script = buildPodcastScript(playScript);
  await runAppleScriptAndCloseWindow(script);
};
