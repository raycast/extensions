import { showHUD } from "@raycast/api";
import { toggleIconsVisibility } from "./utils";

export default async function main() {
  const result = await toggleIconsVisibility();

  if (result === "show") {
    await showHUD("Desktop icons shown");
  } else if (result === "hide") {
    await showHUD("Desktop icons hidden");
  }
}
