import { showHUD } from "@raycast/api";
import { espansoCli } from "./lib/espanso";

export default async function main() {
  try {
    await espansoCli("cmd toggle");
    await showHUD("Espanso toggled");
  } catch (error) {
    await showHUD(`Error: ${error}`);
  }
}
