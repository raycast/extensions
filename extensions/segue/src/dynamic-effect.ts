import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("render/dynamic", "🌊 Dynamic shader enabled");
}
