import { environment, launchCommand, LaunchProps, LaunchType, updateCommandMetadata } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { plane, requirePlaneClient } from "./api/auth";
import { getMyWorkItems } from "./api/my-work-items";
import { describePlaneError } from "./helpers/errors";
import { countWorkItems, formatWorkItemsSubtitle, localDateString } from "./helpers/work-item-counts";
import { HANDOFF_MAX_AGE_MS, MyWorkItemsLaunchContext } from "./helpers/my-work-items";

/** A background run reuses a result My Work Items fetched in the last 5 minutes. */
const BACKGROUND_MAX_AGE_MS = 5 * 60 * 1000;

function isUserInitiated() {
  return environment.launchType === LaunchType.UserInitiated;
}

/** `handOff`: the assigned items were just fetched, so My Work Items reuses them instead of loading again. */
async function openMyWorkItems(handOff = false) {
  if (!isUserInitiated()) return;
  const context: MyWorkItemsLaunchContext | undefined = handOff ? { reuseResultMs: HANDOFF_MAX_AGE_MS } : undefined;
  await launchCommand({ name: "my-work-items", type: LaunchType.UserInitiated, context });
}

/**
 * My Open Work Items: keeps the open assigned count in its root search subtitle, refreshed every 15 minutes in
 * the background (a list command can't refresh in the background). Opening it refreshes and shows My Work Items.
 */
async function command() {
  try {
    requirePlaneClient();
  } catch {
    await updateCommandMetadata({ subtitle: "Open My Work Items to set up" });
    await openMyWorkItems();
    return;
  }

  let fetched = false;
  try {
    const result = await getMyWorkItems("assigned", {
      maxAgeMs: isUserInitiated() ? undefined : BACKGROUND_MAX_AGE_MS,
    });
    fetched = true;
    const counts = countWorkItems(result.items, result.me?.id, localDateString());
    await updateCommandMetadata({ subtitle: formatWorkItemsSubtitle(counts, result.truncated) });
  } catch (error) {
    await updateCommandMetadata({ subtitle: `Couldn't check: ${describePlaneError(error).title}` });
  }
  await openMyWorkItems(fetched);
}

const authorized = withAccessToken(plane)(command);

export default async function main(props: LaunchProps) {
  try {
    await authorized(props);
  } catch (error) {
    // Not signed in yet: a background run can't show the sign-in screen, so it leaves the subtitle alone.
    if (environment.launchType === LaunchType.Background) return;
    throw error;
  }
}
