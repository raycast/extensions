import { showHUD } from "@raycast/api";
import { ensureInstalled } from "./lib/daemon";
import { toggleFlag } from "./lib/flags";
import { AUTOAPPLY_OFF_FLAG } from "./lib/paths";

export default async function Command() {
  await ensureInstalled();
  const set = await toggleFlag(AUTOAPPLY_OFF_FLAG);
  // toggleFlag returns true if the flag is now SET (= auto-follow disabled)
  await showHUD(set ? "Auto-follow OFF" : "Auto-follow ON");
}
