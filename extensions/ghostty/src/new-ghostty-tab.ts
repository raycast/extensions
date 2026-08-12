import { runGhosttyCommand } from "./utils/command";
import { openGhosttyTab } from "./utils/scripts";

export default async function Command() {
  await runGhosttyCommand(openGhosttyTab);
}
