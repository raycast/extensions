import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";

import { createMessage } from "./api/chat";
import { withGoogleAuth } from "./api/google";
import { resolveRecipient } from "./api/spaces";
import { showChatError } from "./helpers/feedback";

/** Sends `message` to an email (DM, created if needed), a space link or name, or an exact space/DM title. */
async function quickMessage(props: LaunchProps<{ arguments: Arguments.QuickMessage }>) {
  const { to, message } = props.arguments;
  if (!message.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "Message is empty" });
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: `Sending to ${to}` });
  try {
    const target = await resolveRecipient(to);
    await createMessage(target.space.name, message);
    await toast.hide();
    await showHUD(`Sent to ${target.title}`);
  } catch (error) {
    await toast.hide();
    await showChatError(error);
  }
}

export default withGoogleAuth(quickMessage);
