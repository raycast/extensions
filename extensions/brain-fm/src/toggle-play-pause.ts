import { runCommand } from "./lib/run-command";
export default async function Command() {
  await runCommand("toggle");
}
