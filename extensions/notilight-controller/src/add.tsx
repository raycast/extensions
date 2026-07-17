import { openDeepLink } from "./utils";

export default async function Command() {
  await openDeepLink("add");
}
