import { runGhosttyCommand } from "./utils/command";
import { openGhosttyWindow } from "./utils/scripts";

export default async function Command() {
  await runGhosttyCommand(openGhosttyWindow);
}
