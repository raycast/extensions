import { showHUD } from "@raycast/api";
import { clockodo } from "./clockodo";

export default async function main() {
  const clock = await clockodo.getClock();

  if (clock.running) {
    await clockodo.stopClock({
      entriesId: clock.running.id,
    });
    await showHUD("Stopped clock");
  } else {
    await showHUD("No running clock found");
  }
}
