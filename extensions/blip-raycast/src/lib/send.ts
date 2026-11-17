/** UI-facing send helper shared by all commands. */
import { closeMainWindow, environment, getPreferenceValues, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { newTransferId, sendLocations } from "./actions";
import { contentTitle, type SendContent } from "./content";
import type { Recipient } from "./model";
import { writeTextFile } from "./outbox";

function toPaths(content: SendContent, transferId: string): string[] {
  switch (content.kind) {
    case "files":
      return content.paths;
    case "image":
      return [content.path];
    case "text":
      if (!content.text.trim()) throw new Error("Type some text to send.");
      return [writeTextFile(environment.supportPath, transferId, content.text)];
  }
}

/** Starts the transfer. Throws on failure. */
export async function sendContent(recipient: { peerId: Recipient["peerId"] }, content: SendContent) {
  const transferId = content.transferId ?? newTransferId();
  await sendLocations(recipient.peerId, toPaths(content, transferId), { transferId });
}

/** Sends and reports the outcome. Returns true on success. */
export async function sendToRecipient(
  recipient: Recipient,
  content: SendContent,
  { note }: { note?: string } = {},
): Promise<boolean> {
  const what = contentTitle(content);
  const toast = await showToast({ style: Toast.Style.Animated, title: `Sending ${what} to ${recipient.name}…` });
  try {
    await sendContent(recipient, content);
    const message = `Sending ${what} to ${recipient.name}${note ? ` · ${note}` : ""}`;
    if (getPreferenceValues<Preferences>().closeAfterSend) {
      await toast.hide();
      await closeMainWindow({ clearRootSearch: true });
      await showHUD(message);
      await popToRoot();
    } else {
      toast.style = Toast.Style.Success;
      toast.title = message;
    }
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Blip send failed";
    toast.message = error instanceof Error ? error.message : String(error);
    return false;
  }
}
