import { showHUD } from "@raycast/api";
import { espansoCli } from "./lib/espanso";

export default async function main() {
  try {
    await espansoCli("cmd disable");
    await showHUD("Espanso disabled");
  } catch (error) {
    await showHUD(`Error: ${error}`);
  }
}
