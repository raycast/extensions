import { openInSpaceManager } from "./app";
import { links } from "./links";

export default async function Command() {
  await openInSpaceManager(links.dashboard);
}
