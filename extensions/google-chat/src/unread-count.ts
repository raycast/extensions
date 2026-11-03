import { environment, getPreferenceValues, launchCommand, LaunchType, updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { withGoogleAuth } from "./api/google";
import { getUnread, SHARED_MAX_AGE_MS, type Unread } from "./api/unread";
import { isBackgroundAuthError } from "./helpers/errors";
import { countMentions, parseLookbackDays, UNREAD_CHECK_FAILED, unreadSubtitle } from "./helpers/unread";

function isBackground(): boolean {
  return environment.launchType === LaunchType.Background;
}

function lookbackDays(): number {
  return parseLookbackDays(getPreferenceValues<Preferences.UnreadCount>().unreadLookbackDays);
}

/** The background check: reuses the shared unread result when under 2 minutes old. */
const checkUnread = withGoogleAuth(async (): Promise<Unread> =>
  getUnread(lookbackDays(), { maxAgeMs: SHARED_MAX_AGE_MS }),
);

async function setSubtitle(subtitle: string): Promise<void> {
  try {
    await updateCommandMetadata({ subtitle });
  } catch (error) {
    console.error("Could not update the subtitle", error);
  }
}

/**
 * Opened by the user: show My Messages' Unread view at once, with no search first. A search takes a few seconds with
 * nothing on screen, and pressing again meanwhile restarts the command ("Worker unloaded"). My Messages searches
 * afresh and updates this command's subtitle.
 */
async function openFromRootSearch(): Promise<void> {
  try {
    await launchCommand({ name: "my-messages", type: LaunchType.UserInitiated, context: { view: "unread" } });
  } catch (error) {
    await showFailureToast(error, { title: "Could not open My Messages" });
  }
}

/**
 * Unread Chat: shows the unread total in its root search subtitle, refreshed every 5 minutes in the background.
 * Run by the user, it opens My Messages' Unread view. Never throws in the background.
 */
export default async function Command() {
  if (!isBackground()) {
    await openFromRootSearch();
    return;
  }
  let unread: Unread;
  try {
    unread = await checkUnread({});
  } catch (error) {
    // Not signed in yet: the sign-in screen can't show in the background, so wait for the user to run a command.
    if (isBackgroundAuthError(error)) return;
    console.error("Unread check failed", error);
    await setSubtitle(UNREAD_CHECK_FAILED);
    return;
  }
  await setSubtitle(unreadSubtitle(unread.total, unread.capped, unread.spaces.length, countMentions(unread.spaces)));
}
