import { runAppleScript } from "run-applescript";

export default async function showTimer() {
  await runAppleScript("tell application \"Flow\" to show");
}
