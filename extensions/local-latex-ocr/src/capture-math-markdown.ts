import { runCaptureCommand } from "./lib/run-capture-command";

export default async function Command() {
  await runCaptureCommand("inline", "capture-math-markdown");
}
