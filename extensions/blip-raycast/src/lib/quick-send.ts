/** Quick Send: send straight to one remembered recipient, kept in Raycast's local storage. */
import { closeMainWindow, environment, launchCommand, LaunchType, LocalStorage, showHUD } from "@raycast/api";
import { applyBlipPreferences } from "./apply-preferences";
import { getClient, setLaunchListener, userMessage } from "./client";
import { contentTitle, type SendContent } from "./content";
import { recipientExists } from "./model";
import { cleanOutbox } from "./outbox";
import { sendContent } from "./send";
import type { PeerId } from "./types";

/** LocalStorage key, also read and written by RecipientList through useLocalStorage (same JSON format). */
export const QUICK_SEND_KEY = "quickSendRecipient";

/** Passed to the picker command when Quick Send runs before a recipient is chosen. */
export interface QuickSendSetupContext {
  setupQuickSend?: boolean;
  /** The remembered recipient that no longer exists, to explain why the picker opened. */
  missingRecipient?: string;
}

export interface QuickSendRecipient {
  peerId: PeerId;
  name: string;
}

async function getQuickSendRecipient(): Promise<QuickSendRecipient | undefined> {
  const raw = await LocalStorage.getItem<string>(QUICK_SEND_KEY);
  try {
    return raw ? (JSON.parse(raw) as QuickSendRecipient) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Shared body of the no-view Quick Send commands. Without a recipient yet, it opens `pickerCommand`
 * (a recipient list for the same content), which sends and remembers the choice.
 */
export async function quickSend(
  getContent: () => Promise<SendContent | undefined>,
  { emptyMessage, pickerCommand }: { emptyMessage: string; pickerCommand: string },
) {
  const openPicker = (missingRecipient?: string) => {
    const context: QuickSendSetupContext = { setupQuickSend: true, missingRecipient };
    return launchCommand({ name: pickerCommand, type: LaunchType.UserInitiated, context });
  };
  const recipient = await getQuickSendRecipient();
  if (!recipient) return openPicker();

  await closeMainWindow();
  const restoreListener = setLaunchListener(() => showHUD("Starting Blip…"));
  let what = "";
  try {
    const content = await getContent();
    if (!content) return await showHUD(emptyMessage);
    what = contentTitle(content);

    const { state } = await getClient().getState();
    await applyBlipPreferences(state.config);
    cleanOutbox(environment.supportPath, state);
    // Only trust "gone" once Blip has loaded its users (it may answer before that right after starting).
    const usersLoaded = Object.keys(state.users?.discovered ?? {}).length > 0;
    if (usersLoaded && !recipientExists(state, recipient.peerId)) {
      await LocalStorage.removeItem(QUICK_SEND_KEY);
      return await openPicker(recipient.name);
    }
    await sendContent(recipient, content);
    await showHUD(`Sending ${what} to ${recipient.name}`);
  } catch (error) {
    // The window is closed, so a HUD is the only feedback; it must carry the reason.
    await showHUD(`Couldn't Send${what ? ` ${what}` : ""}: ${userMessage(error)}`);
  } finally {
    restoreListener();
  }
}
