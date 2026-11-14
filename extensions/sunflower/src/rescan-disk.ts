import { runCommand } from "./lib/sunflower";

export default async function Command() {
  await runCommand("rescan");
}
