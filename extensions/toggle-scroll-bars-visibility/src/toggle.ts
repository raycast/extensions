import { showHUD } from "@raycast/api";
import { ScrollBarValue } from "./types";
import { scrollBarLabel } from "./data/constants";
import { setScrollBarsVisibility, getCurrentScrollBarsVisibility } from "./utils";

export default async function main() {
  const currentValue = getCurrentScrollBarsVisibility();
  const newValue = currentValue !== ScrollBarValue.ALWAYS ? ScrollBarValue.ALWAYS : ScrollBarValue.AUTOMATIC;

  setScrollBarsVisibility(newValue);
  const message = `Set scroll bars visibility to "${scrollBarLabel[newValue]}"`;
  await showHUD(message);
}
