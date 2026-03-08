import { openParachord } from "./utils";
import { showHUD } from "@raycast/api";

export default async function Command() {
  await openParachord("collection-radio", [], {});
  await showHUD("Starting Collection Radio");
}
