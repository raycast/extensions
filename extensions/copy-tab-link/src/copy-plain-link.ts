import { getSettings } from "./lib/settings";
import { runCopyCommand } from "./lib/run";

export default async function Command() {
  await runCopyCommand(getSettings().plainFormat, "copy");
}
