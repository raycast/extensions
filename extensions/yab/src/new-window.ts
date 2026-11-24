import { failed, openWindow } from "./yab";

export default async function Command() {
  await openWindow().catch((e) => failed("Could not open a window", e));
}
