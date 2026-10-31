import { openConfigFile } from "./lib/config-files.ts";

export default async function Command() {
  await openConfigFile("keybindings.json");
}
