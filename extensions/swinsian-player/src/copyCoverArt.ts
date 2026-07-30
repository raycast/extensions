import { showHUD } from "@raycast/api";
import { copyCoverArtFile } from "./helpers/swinsian";

export default async function Command() {
  const msg = await copyCoverArtFile();
  await showHUD(msg);
}
