/** Quick Send: send straight to one remembered recipient, kept in Raycast's local storage. */
import {
  closeMainWindow,
  environment,
  launchCommand,
  LaunchType,
  LocalStorage,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { applyBlipPreferences } from "./apply-preferences";
import { getClient, setLaunchListener, shortReason } from "./client";
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

/** Passed to a Quick Send command launched in the background just to refresh its subtitle. */
export interface QuickSendLaunchContext {
  refreshSubtitle?: boolean;
}

const QUICK_SEND_COMMANDS = ["quick-send-clipboard", "quick-send-selected-files"];

/** Shows the current recipient under the command's name in Raycast ("to Windows PC"). */
async function showRecipientInSubtitle() {
  const recipient = await getQuickSendRecipient();
  await updateCommandMetadata({ subtitle: recipient ? `to ${recipient.name}` : null });
}

/** Updates both Quick Send commands' subtitles after the recipient changed elsewhere. */
export function refreshQuickSendSubtitles() {
  const context: QuickSendLaunchContext = { refreshSubtitle: true };
  for (const name of QUICK_SEND_COMMANDS) {
    launchCommand({ name, type: LaunchType.Background, context }).catch(() => {});
  }
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
  {
    emptyMessage,
    pickerCommand,
    launchContext,
  }: { emptyMessage: string; pickerCommand: string; launchContext?: QuickSendLaunchContext },
) {
  if (launchContext?.refreshSubtitle) return showRecipientInSubtitle();

  const openPicker = (missingRecipient?: string) => {
    const context: QuickSendSetupContext = { setupQuickSend: true, missingRecipient };
    return launchCommand({ name: pickerCommand, type: LaunchType.UserInitiated, context }).catch((error) =>
      showFailureToast(error, { title: "Couldn't Open the Recipient Picker" }),
    );
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
      await showRecipientInSubtitle();
      return await openPicker(recipient.name);
    }
    await sendContent(recipient, content);
    await showRecipientInSubtitle();
    await showHUD(`Sending ${what} to ${recipient.name}`);
  } catch (error) {
    // The window is closed, so a HUD is the only feedback; it must carry the reason.
    await showHUD(`Couldn't Send to ${recipient.name}: ${shortReason(error)}`);
  } finally {
    restoreListener();
  }
}
