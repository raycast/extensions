import { showHUD } from "@raycast/api";
import { espanso } from "./lib/espanso";

export default async function main() {
  try {
    await espanso("cmd toggle");
    await showHUD("Espanso toggled");
  } catch (error) {
    await showHUD(`Error: ${error}`);
  }
}
