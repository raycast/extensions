import { showHUD } from "@raycast/api";
import { $ } from "zx";

export default async function main() {
  const result = await $`espanso cmd toggle`;
  await showHUD("Espanso toggled");
}
