import { runCapture } from "./lib/capture";

export default async function Command() {
  await runCapture("annotateOut");
}
