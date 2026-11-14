import { showHUD } from "@raycast/api";
import { previousTrack } from "./helpers/swinsian";

export default async function Previous() {
  await previousTrack();
  await showHUD("⏮ Previous Track");
}
