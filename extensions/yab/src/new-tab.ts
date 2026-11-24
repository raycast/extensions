import { failed, openTab } from "./yab";

export default async function Command() {
  await openTab().catch((e) => failed("Could not open a tab", e));
}
