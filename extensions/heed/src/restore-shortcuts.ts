import { tell } from "./heed";

export default async function command() {
  await tell("hotkeys/restore", "Restoring Heed's shortcuts", "0.13.0");
}
