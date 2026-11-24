import { failed, openWindow } from "./yab";

export default async function Command() {
  await openWindow(true).catch((e) => failed("Could not open an incognito window", e));
}
