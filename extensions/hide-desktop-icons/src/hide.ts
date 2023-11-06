import { showHUD } from "@raycast/api";
import { hideIcons } from "./utils";


export default async function main() {
  await hideIcons();
  await showHUD("Desktop icons hidden");
}
