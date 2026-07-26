import { showHUD } from "@raycast/api";
import { aerospace, errorMessage } from "./utils/aerospace";

export default async function Command() {
  try {
    await aerospace(["layout", "floating", "tiling"]);
    await showHUD("Toggled floating / tiling");
  } catch (error) {
    await showHUD(`Toggle failed: ${errorMessage(error)}`);
  }
}
