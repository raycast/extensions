import { closeMainWindow, showHUD } from "@raycast/api";
import { errorMessage, getStudios, publish } from "./utils";

export default async function Command() {
  await closeMainWindow();
  try {
    const studios = await getStudios();
    if (studios.length === 0) {
      await showHUD("Roblox Studio isn't running");
      return;
    }
    const target =
      studios.length === 1
        ? studios[0]
        : studios.find((studio) => studio.frontmost);
    if (!target) {
      await showHUD("Multiple Studio instances. Focus one and run again.");
      return;
    }
    await publish(target);
  } catch (error) {
    await showHUD(errorMessage(error));
  }
}
