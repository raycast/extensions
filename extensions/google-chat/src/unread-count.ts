import { environment, getPreferenceValues, launchCommand, LaunchType, updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { withGoogleAuth } from "./api/google";
import { getUnread, SHARED_MAX_AGE_MS, type Unread } from "./api/unread";
import { isBackgroundAuthError } from "./helpers/errors";
import { openInChat, showChatError } from "./helpers/feedback";
import {
  countMentions,
  parseLookbackDays,
  UNREAD_CHECK_FAILED,
  unreadLaunchTarget,
  unreadSubtitle,
} from "./helpers/unread";

function isBackground(): boolean {
  return environment.launchType === LaunchType.Background;
}

/** The shared unread result: reused when under 2 minutes old in the background, searched afresh when run by the user. */
const checkUnread = withGoogleAuth(async (): Promise<Unread> => {
  const lookbackDays = parseLookbackDays(getPreferenceValues<Preferences.UnreadCount>().unreadLookbackDays);
  return getUnread(lookbackDays, { maxAgeMs: isBackground() ? SHARED_MAX_AGE_MS : 0 });
});

async function setSubtitle(subtitle: string): Promise<void> {
  try {
    await updateCommandMetadata({ subtitle });
  } catch (error) {
    console.error("Could not update the subtitle", error);
  }
}

/**
 * Unread Chat: shows the unread total in its root search subtitle, refreshed every 5 minutes. Run by the
 * user, it opens the one conversation with unread messages in Google Chat, or else My Messages' Unread view.
 * Never throws in the background.
 */
export default async function Command() {
  const background = isBackground();
  let unread: Unread;
  try {
    unread = await checkUnread({});
  } catch (error) {
    // Not signed in yet: the sign-in screen can't show in the background, so wait for the user to run a command.
    if (background && isBackgroundAuthError(error)) return;
    console.error("Unread check failed", error);
    await setSubtitle(UNREAD_CHECK_FAILED);
    if (!background) await showChatError(error);
    return;
  }

  await setSubtitle(unreadSubtitle(unread.total, unread.capped, unread.spaces.length, countMentions(unread.spaces)));
  if (background) return;

  const target = unreadLaunchTarget(unread.spaces);
  try {
    if (target.action === "open") {
      await openInChat(target.url);
    } else {
      await launchCommand({ name: "my-messages", type: LaunchType.UserInitiated, context: { view: "unread" } });
    }
  } catch (error) {
    await showFailureToast(error, {
      title: target.action === "open" ? "Could not open Google Chat" : "Could not open My Messages",
    });
  }
}
