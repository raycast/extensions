import { showHUD } from "@raycast/api";
import { $ } from "zx";

export default async function main() {
  try {
    await $`espanso cmd toggle`;
    await showHUD("Espanso toggled");
  } catch (error) {
    await showHUD(`Error: ${error}`);
  }
}
