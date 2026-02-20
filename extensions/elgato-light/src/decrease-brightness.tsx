import { showHUD } from "@raycast/api";
import { brightnessChangeAmount, validateBrightness } from "./lib/utils";
import { executeCommand } from "./lib/commands";

export default async function Main() {
  const error = validateBrightness(brightnessChangeAmount(), "Brightness increment amount");
  if (error) {
    await showHUD(error);
    return;
  }

  await executeCommand(["brightness", "--", `-${brightnessChangeAmount()}`], "Error decreasing light brightness");
}
