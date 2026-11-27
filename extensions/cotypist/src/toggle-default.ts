import { runCommand } from "./lib/command";
export default async function ToggleDefault() {
  await runCommand("toggle-default");
}
