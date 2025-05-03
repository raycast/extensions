import { showHUD } from "@raycast/api";
import { $ } from "zx";

export default async function main() {
  try {
    await $`espanso cmd disable`;
    await showHUD("Espanso disable");
  } catch (error) {
    await showHUD(`Error: ${error}`);
  }
}
