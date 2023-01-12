import { buildPodcastScript, runAppleScriptAndCloseWindow, togglePlayPause } from "./utils";

export default async () => {
  await togglePlayPause();
};
