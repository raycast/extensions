import { openColorSlurpUrl } from "./utilities";

export default async function Command() {
  await openColorSlurpUrl("colorslurp://x-callback-url/show-palettes");
}
