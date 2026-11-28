import { showHUD } from "@raycast/api";
import { Group, errorMessage, getActiveGroup } from "./api";

/** Shared body of the no-view quick commands: act on the active group and report via HUD. */
export async function quick(fn: (group: Group) => Promise<string>) {
  try {
    const { group } = await getActiveGroup();
    await showHUD(await fn(group));
  } catch (e) {
    await showHUD(`⚠️ ${errorMessage(e)}`);
  }
}
