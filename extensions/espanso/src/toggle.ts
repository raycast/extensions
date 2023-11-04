import { showHUD } from "@raycast/api";
import { $ } from "zx";

export default async function main() {
  await $`espanso cmd toggle`;
  await showHUD("Espanso toggled");
}
