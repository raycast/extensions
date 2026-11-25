import { runControl } from "./lib/feedback";

export default async function Command() {
  await runControl(["dictation", "start"], {
    changed: "Recording",
    launch: true,
  });
}
