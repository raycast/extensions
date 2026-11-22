import { press, run } from "./roku";

export default async function Command() {
  await run("⏯ Play/Pause", () => press("Play"));
}
