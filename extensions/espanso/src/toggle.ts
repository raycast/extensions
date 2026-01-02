import { showHUD } from "@raycast/api";
import { execPromise, getEspansoCmd } from "./lib/utils";

export default async function main() {
  try {
    await execPromise(`${getEspansoCmd()} cmd toggle`);
    await showHUD("Espanso toggled");
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
