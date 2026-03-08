import { openParachord } from "./utils";

export default async function Command() {
  // Since we can't detect current state, we use resume which toggles
  await openParachord("control", ["resume"], {}, "Toggled playback");
}
