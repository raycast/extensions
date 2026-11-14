import { logger } from "@chrismessina/raycast-logger";
import { LaunchProps, open, popToRoot, showToast, Toast } from "@raycast/api";
import { addDailyChatMessage, DAILY_CHAT_DEEP_LINK, PLANS_URL, whoami } from "./lib/api";
import { IS_MAC } from "./lib/cli";
import { failToast, uploadAfterSaving } from "./lib/feedback";

const log = logger.child("[daily-chat]");

export default async function Command(props: LaunchProps<{ arguments: Arguments.AddToDailyChat }>) {
  const message = props.arguments.message.trim();
  if (!message) {
    await showToast({ style: Toast.Style.Failure, title: "Type a Message to Add" });
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Adding to Daily Chat…" });

  // Not a gate: on Silver, Daily Chat still keeps your messages; only Day One's replies need Gold. So the plan only
  // changes what the success toast says, and the check runs alongside the write.
  const hasReplies = whoami()
    .then((account) => {
      log.debug("plan checked", { plan: account.plan, dailyChat: account.dailyChat });
      return account.dailyChat !== false;
    })
    .catch((error) => {
      log.warn("couldn't check the plan", error);
      return true;
    });

  try {
    await addDailyChatMessage(message);
    log.debug("message added locally", { chars: message.length });
    // Raycast keeps a no-view command's argument filled in; clear it so reopening Raycast doesn't start from this message.
    await popToRoot({ clearSearchBar: true });
  } catch (error) {
    await failToast(error, "Couldn't Add to Daily Chat", toast);
    return;
  }
  const summary = await uploadAfterSaving(toast, "Added to Today's Daily Chat");
  if (!summary) return;
  const replies = await hasReplies;
  if (!replies && !summary.alreadyRunning) toast.message = "Uploaded. Replies from Day One need a Gold plan";
  const plans: Toast.ActionOptions = { title: "See Day One Plans", onAction: () => open(PLANS_URL) };
  if (IS_MAC) {
    toast.primaryAction = { title: "Open Daily Chat", onAction: () => open(DAILY_CHAT_DEEP_LINK) };
    if (!replies) toast.secondaryAction = plans;
  } else if (!replies) {
    toast.primaryAction = plans;
  }
}
