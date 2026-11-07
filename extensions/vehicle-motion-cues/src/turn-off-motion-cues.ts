import { runMotionCues } from "./motion-cues";

export default async function Command() {
  await runMotionCues("off");
}
