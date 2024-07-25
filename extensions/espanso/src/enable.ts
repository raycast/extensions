import { showHUD } from "@raycast/api";
import { espanso } from "./lib/espanso";

export default async function main() {
  try {
    await espanso("cmd enable");
    await showHUD("Espanso enabled");
  } catch (error) {
    await showHUD(`Error: ${error}`);
  }
}
