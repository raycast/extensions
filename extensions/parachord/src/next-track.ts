import { openParachord } from "./utils";

export default async function Command() {
  await openParachord("control", ["next"], {}, "Skipped to next track");
}
