import { runCommand } from "./lib/command";
export default async function DisableDefault() {
  await runCommand("disable-default");
}
