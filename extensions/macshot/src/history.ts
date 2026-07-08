import { openMacShot } from "./actions";

export default async function Command() {
  await openMacShot("history", "Show History");
}
