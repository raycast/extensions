import { showHUD, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";

import { constructWhoSampledURL } from "./constants";

export async function searchByCurrentlyPlaying(script: string, applicationName: string) {
  const result = await runAppleScript(script);
  if (result === "NOT_RUNNING") {
    await showHUD(`❌ ${applicationName} is not running`);
    return;
  }

  if (result === "NOT_PLAYING") {
    await showHUD(`❌ ${applicationName} is not playing`);
    return;
  }

  const strippedResult = result.replace(/ \([^)]*\)/g, "").replace(/ *\[[^)]*\]/g, "");
  console.log(strippedResult);
  const searchURL = constructWhoSampledURL(encodeURIComponent(strippedResult));
  await open(searchURL);
  await showHUD(`Searching WhoSampled for ${result}...`);
}

export async function searchByTrackAndArtist(track: string, artists?: string) {
  const query = `${track}${artists ? ` ${artists}` : ""}`;
  const searchURL = constructWhoSampledURL(encodeURIComponent(query));
  await open(searchURL);
  await showHUD(`Searching WhoSampled for ${query}...`);
}
