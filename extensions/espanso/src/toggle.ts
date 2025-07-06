import { showHUD } from "@raycast/api";
import { execPromise } from "./lib/utils";

export default async function main() {
  try {
    await execPromise("espanso cmd toggle");
    await showHUD("Espanso toggled");
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
