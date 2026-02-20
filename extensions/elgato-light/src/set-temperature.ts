import { showHUD } from "@raycast/api";
import { validateTemperature } from "./lib/utils";
import { executeCommand } from "./lib/commands";

export default async function Main({ arguments: { temperature } }: { arguments: { temperature: string } }) {
  const error = validateTemperature(temperature, "Temperature");
  if (error) {
    await showHUD(error);
    return;
  }

  await executeCommand(["temperature", temperature], "Error setting light temperature");
}
