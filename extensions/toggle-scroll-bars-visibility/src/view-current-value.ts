import { showHUD } from "@raycast/api";
import { scrollBarLabel } from "./data/constants";
import { getCurrentScrollBarsVisibility } from "./utils";

export default async function main() {
  const value = getCurrentScrollBarsVisibility();
  const message = `Current scroll bars visibility value is "${scrollBarLabel[value]}"`;
  await showHUD(message);
}
