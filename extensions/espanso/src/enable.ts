import { showHUD } from "@raycast/api";
import { espansoCli } from "./lib/espanso";

export default async function main() {
  try {
    await espansoCli("cmd enable");
    await showHUD("Espanso enabled");
  } catch (error) {
    await showHUD(`Error: ${error}`);
  }
}
