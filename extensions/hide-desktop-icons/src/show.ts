import { showHUD } from "@raycast/api";
import { showIcons } from "./utils";

export default async function main() {
  await showIcons();
  await showHUD("Desktop icons shown");
}
