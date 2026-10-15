import { environment, getPreferenceValues, launchCommand, LaunchType, updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { withGoogleAuth } from "./api/google";
import { getUnread, peekSharedUnread, SHARED_MAX_AGE_MS, type Unread } from "./api/unread";
import { isBackgroundAuthError } from "./helpers/errors";
import { openInChat } from "./helpers/feedback";
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

/** Opening Unread Chat reuses a shared result this recent to pick the conversation, instead of searching first. */
const OPEN_MAX_AGE_MS = 5 * 60 * 1000;

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
 * Opened by the user: act at once, with no search first. A search takes a few seconds with nothing on screen, and
 * pressing again meanwhile restarts the command ("Worker unloaded"). With a recent result showing exactly one
 * conversation, open it in Google Chat; otherwise open My Messages' Unread view, which searches afresh and
 * updates this command's subtitle.
 */
async function openFromRootSearch(): Promise<void> {
  const recent = peekSharedUnread(lookbackDays(), OPEN_MAX_AGE_MS);
  const target = recent ? unreadLaunchTarget(recent.spaces) : ({ action: "list" } as const);
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

/**
 * Unread Chat: shows the unread total in its root search subtitle, refreshed every 5 minutes in the background.
 * Run by the user, it opens the one conversation with unread messages in Google Chat, or else My Messages'
 * Unread view. Never throws in the background.
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
