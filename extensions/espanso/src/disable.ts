import { showHUD } from "@raycast/api";
import { espanso } from "./lib/espanso";

export default async function main() {
  try {
    await espanso("cmd disable");
    await showHUD("Espanso disabled");
  } catch (error) {
    await showHUD(`Error: ${error}`);
  }
}
