import { showHUD } from "@raycast/api";
import { cycleShuffle } from "./helpers/swinsian";

export default async function ToggleShuffle() {
  const next = await cycleShuffle();
  const label = next === "none" ? "Off" : next === "track shuffle" ? "Track Shuffle" : "Album Shuffle";
  await showHUD(`Shuffle: ${label}`);
}
