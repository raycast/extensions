import { runCaptureCommand } from "./lib/run-capture-command";

export default async function Command() {
  await runCaptureCommand("display", "capture-display-math");
}
