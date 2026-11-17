/** The one recipient that Quick Send commands deliver to, kept in Raycast's local storage. */
import { closeMainWindow, environment, launchCommand, LaunchType, LocalStorage, showHUD } from "@raycast/api";
import { contentTitle, readClipboardContent, type SendContent } from "./content";
import type { PeerId } from "./types";
import { recipientKey } from "./model";
import { sendContent } from "./send";

const KEY = "quickSendRecipient";

/** Passed to the picker command when Quick Send runs before a recipient is chosen. */
export interface QuickSendSetupContext {
  setupQuickSend?: boolean;
}

export interface QuickSendRecipient {
  key: string;
  peerId: PeerId;
  name: string;
}

export async function getQuickSendRecipient(): Promise<QuickSendRecipient | undefined> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as QuickSendRecipient;
  } catch {
    return undefined;
  }
}

export async function setQuickSendRecipient(recipient: { peerId: PeerId; name: string } | undefined) {
  if (!recipient) return LocalStorage.removeItem(KEY);
  const value: QuickSendRecipient = {
    key: recipientKey(recipient.peerId),
    peerId: recipient.peerId,
    name: recipient.name,
  };
  await LocalStorage.setItem(KEY, JSON.stringify(value));
}

/**
 * Shared body of the no-view Quick Send commands. The first time, there is no recipient yet, so
 * it opens `pickerCommand` (a recipient list for the same content) which sends and remembers the choice.
 */
export async function quickSend(
  getContent: () => Promise<SendContent | undefined>,
  { emptyMessage, pickerCommand }: { emptyMessage: string; pickerCommand: string },
) {
  const recipient = await getQuickSendRecipient();
  if (!recipient) {
    const context: QuickSendSetupContext = { setupQuickSend: true };
    return launchCommand({ name: pickerCommand, type: LaunchType.UserInitiated, context });
  }
  await closeMainWindow();
  try {
    const content = await getContent();
    if (!content) return showHUD(emptyMessage);
    await sendContent(recipient, content);
    await showHUD(`Sending ${contentTitle(content)} to ${recipient.name}`);
  } catch (error) {
    await showHUD(`Blip send failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const readClipboardForQuickSend = () => readClipboardContent(environment.supportPath);
