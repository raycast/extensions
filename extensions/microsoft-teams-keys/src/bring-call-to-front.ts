import { showHUD } from "@raycast/api";
import { report } from "./lib/meeting";
import { bringCallToFront } from "./lib/teams";

export default async function Command() {
  try {
    const title = await bringCallToFront();
    await showHUD(title ? `Back to ${title}` : "Back to the call");
  } catch (error) {
    await report(error, "Could not find the call");
  }
}
