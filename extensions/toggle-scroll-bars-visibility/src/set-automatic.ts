import { showHUD } from "@raycast/api";
import { ScrollBarValue } from "./types";
import { scrollBarLabel } from "./data/constants";
import { setScrollBarsVisibility } from "./utils";

export default async function main() {
  setScrollBarsVisibility(ScrollBarValue.AUTOMATIC);
  const message = `Set scroll bars visibility to "${scrollBarLabel[ScrollBarValue.AUTOMATIC]}"`;
  await showHUD(message);
}
