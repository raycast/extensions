import { tell } from "./heed";

export default async function command() {
  await tell("hotkeys/release", "Releasing Heed's shortcuts", "0.13.0");
}
