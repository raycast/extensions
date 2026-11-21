/** Sending, shared by every command. */
import {
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { newId, sendLocations } from "./actions";
import { userMessage } from "./client";
import { contentTitle, type SendContent } from "./content";
import { copyIntoOutbox, writeTextFile } from "./outbox";
import type { PeerId } from "./types";

function toPaths(content: SendContent, transferId: string): string[] {
  switch (content.kind) {
    case "files":
      return content.paths;
    case "image":
      // Each send gets its own copy, so one copied image can go to several people.
      return [copyIntoOutbox(environment.supportPath, transferId, content.path)];
    case "text":
      if (!content.text.trim()) throw new Error("Type some text to send.");
      return [writeTextFile(environment.supportPath, transferId, content.text, content.concealed ? "Text" : undefined)];
  }
}

/** Starts the transfer and waits until Blip has accepted it. Throws on failure. */
export async function sendContent(recipient: { peerId: PeerId }, content: SendContent) {
  const transferId = newId();
  await sendLocations(recipient.peerId, toPaths(content, transferId), { transferId });
}

let sending = false;

/**
 * Sends and reports the outcome. Returns true on success.
 * `keepOpen` leaves Raycast open (to send to someone else next) even if the preference says to close.
 */
export async function sendToRecipient(
  recipient: { peerId: PeerId; name: string },
  content: SendContent,
  {
    note,
    keepOpen = false,
    onSent,
  }: {
    note?: string;
    keepOpen?: boolean;
    /** Runs once the send has started, before Raycast closes (so its work isn't cut short). */
    onSent?: () => Promise<unknown>;
  } = {},
): Promise<boolean> {
  const what = contentTitle(content);
  if (sending) {
    await showToast({ style: Toast.Style.Failure, title: "Wait for the Current Send to Start" });
    return false;
  }
  sending = true;
  try {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Sending ${what} to ${recipient.name}…` });
    await sendContent(recipient, content);
    await onSent?.();
    if (!keepOpen && getPreferenceValues<Preferences>().closeAfterSend) {
      await toast.hide();
      await showHUD(`Sending ${what} to ${recipient.name}${note ? ` (${note})` : ""}`, {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Transfer Started";
      toast.message = `${what} to ${recipient.name}${note ? ` (${note})` : ""}`;
      toast.primaryAction = {
        title: "Manage Transfers",
        onAction: () =>
          launchCommand({ name: "transfers", type: LaunchType.UserInitiated }).catch((error) =>
            showFailureToast(error, { title: "Couldn't Open Manage Transfers" }),
          ),
      };
    }
    return true;
  } catch (error) {
    await showFailureToast(error, { title: `Couldn't Send ${what}`, message: userMessage(error) });
    return false;
  } finally {
    sending = false;
  }
}
