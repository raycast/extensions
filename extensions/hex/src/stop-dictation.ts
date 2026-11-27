import { runControl } from "./lib/feedback";

export default async function Command() {
  await runControl(["dictation", "stop"], { changed: "Transcribing" });
}
