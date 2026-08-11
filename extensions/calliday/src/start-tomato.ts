import { showHUD } from "@raycast/api";
import { calliday } from "./lib/cli";

export default async function StartTomato() {
  try {
    const output = await calliday(["tomatoes", "--start"]);
    const minutes = output.match(/(\d+)\s*minutes/)?.[1];
    await showHUD(
      minutes
        ? `🍅 Planted — ripens in ${minutes} min of focus`
        : "🍅 Tomato planted",
    );
  } catch (error) {
    await showHUD(`Couldn't start a tomato: ${(error as Error).message}`);
  }
}
