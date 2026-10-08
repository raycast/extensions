import { openMacShot } from "./actions";

export default async function Command() {
  await openMacShot("settings", "Open Settings");
}
