import { showHUD } from "@raycast/api";
import { ScrollBarValue } from "./types";
import { scrollBarLabel } from "./data/constants";
import { setScrollBarsVisibility } from "./utils";

export default async function main() {
  setScrollBarsVisibility(ScrollBarValue.WHEN_SCROLLING);
  const message = `Set scroll bars visibility to "${scrollBarLabel[ScrollBarValue.WHEN_SCROLLING]}"`;
  await showHUD(message);
}
