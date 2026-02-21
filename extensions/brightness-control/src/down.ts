import { showHUD } from "@raycast/api";
import { adjustBrightness } from "./utils/platform";

export default async () => {
  if (await adjustBrightness(-10)) {
    await showHUD("Brightness decreased");
  }
};
