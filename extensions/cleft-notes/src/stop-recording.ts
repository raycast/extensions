import { captureCommand } from "./lib/capture-command";
export default async function Command() {
  await captureCommand("stop");
}
