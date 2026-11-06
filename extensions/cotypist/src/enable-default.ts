import { runCommand } from "./lib/command";
export default async function EnableDefault() {
  await runCommand("enable-default");
}
