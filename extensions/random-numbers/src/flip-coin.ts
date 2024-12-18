import { showHUD } from "@raycast/api";
import maybeWait from "./delay";

export default async function Command() {
  const value = Math.random() < 0.5 ? "Heads" : "Tails";
  await maybeWait();
  showHUD(value, { clearRootSearch: true });
}
