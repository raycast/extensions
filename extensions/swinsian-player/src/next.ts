import { showHUD } from "@raycast/api";
import { nextTrack } from "./helpers/swinsian";

export default async function Next() {
  await nextTrack();
  await showHUD("⏭ Next Track");
}
